// services/recurring/queue.js
import bullmq from "bullmq";
const { Queue, Worker, QueueEvents } = bullmq;
import IORedis from "ioredis";
import { RecurringTopup, Order, OrderItem, ProductVariant, Operator, PaymentIntent, TopupLog } from "../../models/index.js";
import { Topups } from "../providers/index.js";
import { stripeProvider } from "../providers/payments/stripe.js";
import { scheduleTopupRetry } from "../orders/fulfillment.js";  // ← reuse your retry pipeline
import { convertMinor } from "../../utils/fx.js";
import { Op } from "sequelize";
import { computeNextRunAt } from "./computeNextRunAt.js";

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

export const QUEUE_SCAN = "recurring-scan";
export const QUEUE_RUN = "recurring-run";

const queueOpts = { connection, prefix: "tohfa" };

export const recurringScanQueue = new Queue(QUEUE_SCAN, queueOpts);
export const recurringRunQueue = new Queue(QUEUE_RUN, {
    ...queueOpts,
    defaultJobOptions: { removeOnComplete: 200, removeOnFail: 200 },
});

function pickProviderByOperatorId(_operator_id) {
    return Topups.awcc; // expand later
}

export async function startRecurringScanner() {
    await recurringScanQueue.add(
        "scan-due",
        {},
        { repeat: { every: 5 * 60 * 1000 }, jobId: "recurring-scan-cron" }
    );
}

export function startRecurringScanWorker() {
    new Worker(
        QUEUE_SCAN,
        async () => {
            const due = await RecurringTopup.findAll({
                where: { active: true, next_run_at: { [Op.lte]: new Date() } },
                order: [["next_run_at", "ASC"]],
                limit: 500,
            });

            for (const r of due) {
                await recurringRunQueue.add(
                    "run",
                    { id: r.id },
                    { jobId: `recurring-run-${r.id}-${Date.now()}` }
                );
            }
        },
        queueOpts
    );
}

// Better: scan directly in run worker trigger elsewhere; keeping simple:
export function startRecurringRunWorker() {
    new Worker(
        QUEUE_RUN,
        async (job) => {
            const { id } = job.data;
            const r = await RecurringTopup.findByPk(id);
            if (!r || !r.active) return;

            // 1) Build a fresh order/item snapshot from the schedule
            const variant = await ProductVariant.findByPk(r.product_variant_id);
            if (!variant) throw new Error("Variant not found for recurring");

            const order = await Order.create({
                user_id: r.user_id,
                status: "created",
                total_minor: Number(r.amount_afn_minor ?? 0),
                currency: "AFN",
                email: null,
                phone: null,
            });

            const item = await OrderItem.create({
                order_id: order.id,
                product_variant_id: variant.id,
                quantity: 1,
                unit_price_minor: Number(r.amount_afn_minor ?? 0),
                currency: "AFN",
                msisdn: r.msisdn,
                operator_id: r.operator_id ?? variant.operator_id ?? null,
                display_usd_minor: r.amount_usd_minor ?? null,
                fx_rate_to_usd_snapshot: null,
                is_custom_amount: r.is_custom_amount,
                customer_entered_usd_minor: r.amount_usd_minor ?? null,
            });

            // 2) Compute USD minor to charge
            let usdMinor = r.amount_usd_minor != null
                ? Number(r.amount_usd_minor)
                : Number(await convertMinor(BigInt(item.unit_price_minor), "AFN", "USD"));

            if (!Number.isInteger(usdMinor) || usdMinor <= 0) {
                r.last_run_at = new Date();
                r.last_error = "invalid_amount";
                await r.save();
                return;
            }

            // 3) Authorize off-session PI using saved PM; if not authorized, STOP (no SOAP, no retries)
            const created = await stripeProvider.createIntent({
                order,
                amount_minor_usd: String(usdMinor),
                capture_method: "manual",
                customer: r.stripe_customer_id || undefined,
                payment_method: r.stripe_payment_method_id || undefined,
                confirm: true,
                off_session: true,
            });

            const intent = await PaymentIntent.create({
                user_id: order.user_id,
                order_id: order.id,
                provider: "stripe",
                amount_minor: String(created.amount_minor),
                currency: created.currency,
                status: created.status === "requires_capture" ? "pending" : created.status,
                provider_ref: created.provider_ref,
            });

            const authorized = intent.status === "pending"; // 'requires_capture' → we set 'pending'
            const next = computeNextRunAt({
                from: r.frequency === "date" ? new Date() : r.next_run_at,
                frequency: r.frequency,
                start_at: r.scheduled_date ?? null,
            });
            if (!authorized) {
                // Card requires action/failed/etc. — do NOT enqueue SOAP retries.
                order.status = "cancelled"; await order.save();
                r.last_run_at = new Date();
                r.last_error = `authorization_failed:${created.status}`;
                // advance next run normally (or keep same next_run to retry soon—your call)
                r.next_run_at = next;
                if (r.frequency === "date") r.active = false;
                await r.save();
                return;
            }

            // 4) SOAP first attempt now
            const provider = pickProviderByOperatorId(item.operator_id);
            const extId = `rec${r.id}-ord${order.id}-item${item.id}`;
            const firstResult = await provider.topup({ order, item, variant, externalId: extId });

            await TopupLog.create({
                order_item_id: item.id,
                provider: provider.name,
                operator_id: item.operator_id || null,
                msisdn: item.msisdn || null,
                request_payload: firstResult.request,
                response_payload: firstResult.response,
                status: firstResult.status,
                provider_txn_id: firstResult.provider_txn_id || extId,
                error_code: firstResult.error_code || null,
                error_message: firstResult.error_message || null,
            });

            if (firstResult.status === "accepted" || firstResult.status === "delivered") {
                // 5) Capture & finalize order
                try { await stripeProvider.captureIntent(intent.provider_ref); } catch { }
                intent.status = "succeeded"; await intent.save();
                order.status = "paid"; await order.save();
                order.status = "fulfilled"; await order.save();

                // advance schedule
                r.last_run_at = new Date();
                r.times_run = (r.times_run || 0) + 1;
                r.last_error = null;
                const next = computeNextRunAt({
                    from: r.frequency === "date" ? new Date() : r.next_run_at,
                    frequency: r.frequency,
                    start_at: r.scheduled_date ?? null,
                });
                r.next_run_at = next;
                if (r.frequency === "date") r.active = false;
                await r.save();
                return;
            }

            // 6) SOAP failed → queue the same 1–5 minute retry pipeline you already use
            await scheduleTopupRetry({
                order_id: order.id,
                order_item_id: item.id,
                intent_provider: "stripe",
                intent_ref: intent.provider_ref,
                next_try: 1,
            });

            r.last_run_at = new Date();
            r.last_error = firstResult.error_message || firstResult.error_code || "topup_failed";
            await r.save();
        },
        { ...queueOpts, concurrency: 5 }
    );
}


export async function startRecurringWorkers() {
    await startRecurringScanner();
    startRecurringRunWorker();
}
