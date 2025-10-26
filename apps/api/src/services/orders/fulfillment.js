import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { Order, OrderItem, ProductVariant, TopupLog, PaymentIntent } from "../../models/index.js";
import { Topups } from "../providers/index.js";
import { stripeProvider } from "../providers/payments/stripe.js";

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

export const topupQueue = new Queue("topup", { connection });

// short lock to avoid concurrent sends for the same item (does NOT block scheduled retries)
function lockKey(orderId, itemId) {
    return `topup:lock:${orderId}:${itemId}`;
}

export async function scheduleTopupRetry({ order_id, order_item_id, intent_provider, intent_ref, next_try }) {
    if (next_try > 5) return;                // stop after try #5
    const delayMs = (next_try - 1) * 60_000; // 1m,2m,3m,4m,5m
    await topupQueue.add(
        "topup",
        { order_id, order_item_id, try: next_try, intent_provider, intent_ref },
        {
            delay: delayMs,
            jobId: `topup:${order_id}:${order_item_id}:try${next_try}`, // idempotent
            removeOnComplete: 50,
            removeOnFail: 100
        }
    );
}
// (optional helper if you want to kick off retries for every item in an order)
export async function enqueueTopupsForOrder(orderId, { intent_provider, intent_ref } = {}) {
    const items = await OrderItem.findAll({ where: { order_id: orderId } });
    for (const it of items) {
        await scheduleTopupRetry({
            order_id: orderId,
            order_item_id: it.id,
            intent_provider: intent_provider || "stripe",
            intent_ref: intent_ref || null,
            next_try: 1
        });
    }
}

export function startTopupWorker() {
    new Worker("topup", async (job) => {
        const { order_id, order_item_id, try: tryNo = 1, intent_provider = "stripe", intent_ref = null } = job.data;
        const item = await OrderItem.findByPk(order_item_id);
        if (!item) return;

        const variant = await ProductVariant.findByPk(item.product_variant_id);
        const order = await Order.findByPk(order_id);
        if (!variant || !order) return;

        // acquire short lock (30s) to prevent concurrent sends
        const key = lockKey(order_id, order_item_id);
        const gotLock = await connection.set(key, "1", "NX", "EX", 30);
        if (!gotLock) return; // another attempt in progress; skip quietly

        // select operator/provider; for now if variant.operator_id resolves to AWCC, choose awcc
        const provider = Topups.awcc; // or use your pickTopupProvider logic here
        const extId = `ord${order.id}-item${item.id}`; // idempotent externalTransactionId

        const result = await provider.topup({ order, item, variant, externalId: extId });

        // Consolidate to ONE log row per item (update-or-create)
        const existing = await TopupLog.findOne({ where: { order_item_id: item.id, provider_txn_id: extId } });
        if (existing) {
            existing.provider = provider.name;
            existing.request_payload = result.request;
            existing.response_payload = result.response;
            existing.status = result.status;
            existing.error_code = result.error_code || null;
            existing.error_message = result.error_message || null;
            await existing.save();
        } else {
            await TopupLog.create({
                order_item_id: item.id,
                provider: provider.name,
                operator_id: item.operator_id || null,
                msisdn: item.msisdn || null,
                request_payload: result.request,
                response_payload: result.response,
                status: result.status,
                provider_txn_id: result.provider_txn_id || extId,
                error_code: result.error_code || null,
                error_message: result.error_message || null
            });
        }

        // success → capture + mark paid/fulfilled
        if (result.status === "accepted" || result.status === "delivered") {
            if (intent_provider === "stripe" && intent_ref) {
                try { await stripeProvider.captureIntent(intent_ref); } catch { }
                const pi = await PaymentIntent.findOne({ where: { provider_ref: intent_ref } });
                if (pi) { pi.status = "succeeded"; await pi.save(); }
            }
            if (order.status !== "fulfilled") {
                order.status = "paid";
                await order.save();
                order.status = "fulfilled";
                await order.save();
            }
            await connection.del(key);
            return;
        }

        // failure → schedule next try or finalize
        const finalFail = tryNo >= 5 || result.error_code === "AUTH";
        await connection.del(key);
        if (!finalFail) {
            await scheduleTopupRetry({
                order_id,
                order_item_id,
                intent_provider,
                intent_ref,
                next_try: tryNo + 1
            });
            return;
        }

        // final failure: cancel hold
        if (intent_provider === "stripe" && intent_ref) {
            try { await stripeProvider.cancelIntent(intent_ref); } catch { }
            const pi = await PaymentIntent.findOne({ where: { provider_ref: intent_ref } });
            if (pi) { pi.status = "cancelled"; await pi.save(); }
        }
        if (!["cancelled", "refunded"].includes(order.status)) {
            order.status = "cancelled";
            await order.save();
        }

    }, { connection });
}
