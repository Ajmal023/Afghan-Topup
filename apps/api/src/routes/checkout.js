// // routes/checkout.js
import { Router } from "express";
import { useIdempotency } from "../services/idempotency.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import { Order, OrderItem, PaymentIntent, ProductVariant, TopupLog, Operator, RecurringTopup } from "../models/index.js";
import { priceItems } from "../services/orders/pricing.js";
import { stripeProvider } from "../services/providers/payments/stripe.js";
import { audit } from "../services/audit.js";
import { Topups } from "../services/providers/index.js";
import { scheduleTopupRetry } from "../services/orders/fulfillment.js";
import { computeNextRunAt } from "../services/recurring/computeNextRunAt.js";
import { Op } from "sequelize";

export const checkoutRouter = Router();

async function pickTopupProvider(operatorId) {
    if (!operatorId) return Topups.awcc; // sensible default for now
    const op = await Operator.findByPk(operatorId);
    const code = (op?.code || "").toUpperCase();
    switch (code) {
        case "AWCC": return Topups.awcc;
        // case "ETISALAT": return Topups.etisalat;
        // case "MTN": return Topups.mtn;
        default: return Topups.awcc;
    }
}

function makeOrderNo() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    // keep it simple; if you want strictly sequential, persist a counter in DB/Redis
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TOH-${y}${m}${day}-${rand}`;
}


checkoutRouter.post("/topup", optionalAuth, useIdempotency, async (req, res, next) => {
    try {
        const userId = req.cookies?.access_token ? req.user?.id : null;
        const { recurring } = req.body || {};
        const isLoggedIn = !!userId;

        if (recurring?.frequency && !isLoggedIn) {
            return res.status(401).json({
                error: "login_required",
                message: "You must be logged in to schedule recurring top-ups."
            });
        }

        // Body
        const {
            email, phone, items, promo_code = null,
            payment = {
                provider: "stripe",
                // For Postman tests only (avoid SCA): auto-confirm with test PM
                test_payment_method: null,
                mode: "authorize_then_capture" // default safe mode
            }
        } = req.body || {};

        // --- Soft lock by msisdn for 5 minutes if a recent non-final attempt exists ---
        if (Array.isArray(items) && items[0]?.msisdn) {
            const msisdn = String(items[0].msisdn);
            const since = new Date(Date.now() - 5 * 60 * 1000);
            const recent = await TopupLog.findOne({
                where: {
                    msisdn,
                    createdAt: { [Op.gte]: since },
                    // treat anything other than delivered/accepted/failed/cancelled as "in progress"
                    status: { [Op.notIn]: ["delivered", "accepted", "failed", "cancelled"] },
                },
                order: [["createdAt", "DESC"]],
            });
            if (recent) {
                // remaining seconds in the 5m window (rough ETA)
                const retryIn = Math.max(
                    0,
                    5 * 60 - Math.floor((Date.now() - new Date(recent.createdAt).getTime()) / 1000)
                );
                return res.status(409).json({
                    error: "topup_in_progress",
                    message:
                        "A top-up for this number is still processing. Please wait a few minutes and try again.",
                    retry_in_seconds: retryIn,
                });
            }
        }

        if (!Array.isArray(items) || items.length !== 1) {
            return res.status(400).json({ error: "items required" });
        }

        // 1) Price + create order & items
        const priced = await priceItems(items);
        const order = await Order.create({
            order_no: makeOrderNo(),
            user_id: userId,
            status: "created",
            total_minor: priced.total_minor,
            currency: "AFN",
            email: userId ? null : email,
            phone: userId ? null : phone
        });

        const createdItems = [];
        for (const it of priced.items) {
            const { order_id: _ignore, ...rest } = it; // drop null
            const row = await OrderItem.create({ ...rest, order_id: order.id }); // put order_id last
            createdItems.push(row);
        }

        // 2) Prepare payment (Stripe manual capture)
        if (payment.provider !== "stripe") {
            return res.status(400).json({ error: "only stripe supported in this flow for now" });
        }

        const line = createdItems[0];
        const qty = Number(line.quantity || 1);

        const usdMinor = Number(line.display_usd_minor ?? 0);
        if (!Number.isInteger(usdMinor) || usdMinor <= 0) {
            return res.status(400).json({ error: "invalid amount" });
        }
        const created = await stripeProvider.createIntent({
            order,
            amount_minor_usd: String(usdMinor), // already minor
            capture_method: "manual",
            payment_method: payment.test_payment_method || null,
            confirm: !!payment.test_payment_method,
            customer: isLoggedIn ? (await stripeProvider.getOrCreateCustomer({ email: req.user?.email ?? order.email, user_id: userId })) : null,
            setup_future_usage: isLoggedIn ? "off_session" : null,
        });
        const intent = await PaymentIntent.create({
            user_id: order.user_id,
            order_id: order.id,
            provider: "stripe",
            amount_minor: String(created.amount_minor),
            currency: created.currency,
            status: created.status === "requires_capture" ? "pending" : "created", // authorized -> pending
            provider_ref: created.provider_ref
        });

        // If not authorized yet (e.g., requires_action in real cards), surface next_action and stop here.
        if (created.client_secret && created.status !== "requires_capture" && !payment.test_payment_method) {
            return res.status(202).json({
                data: {
                    order,
                    payment_intent: intent,
                    next_action: { type: "stripe_client_secret", client_secret: created.client_secret },
                },
            });
        }

        // 3) Single SOAP attempt now (fast feedback). Further retries happen in background.
        const item = createdItems[0];
        console.log(item, "items");
        const variant = await ProductVariant.findByPk(item.product_variant_id);
        if (!variant) throw new Error("Variant not found during topup");
        const provider = await pickTopupProvider(item.operator_id);
        const extId = `ord${order.id}-item${item.id}`;
        const firstResult = await provider.topup({ order, item, variant, externalId: extId });
        // Upsert ONE TopupLog row
        const existing = await TopupLog.findOne({ where: { order_item_id: item.id, provider_txn_id: extId } });
        if (existing) {
            existing.provider = provider.name;
            existing.request_payload = firstResult.request;
            existing.response_payload = firstResult.response;
            existing.status = firstResult.status;
            existing.error_code = firstResult.error_code || null;
            existing.error_message = firstResult.error_message || null;
            await existing.save();
        } else {
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
                error_message: firstResult.error_message || null
            });
        }

        if (firstResult.status !== "accepted" && firstResult.status !== "delivered") {
            // Schedule background retries (1..5 minutes from now) and return 202
            await scheduleTopupRetry({
                order_id: order.id,
                order_item_id: item.id,
                intent_provider: "stripe",
                intent_ref: intent.provider_ref,
                next_try: 1
            });
            await maybeCreateRecurringSchedule({ firstAttemptStatus: firstResult.status });
            return res.status(202).json({
                data: {
                    order,
                    payment_intent: intent,
                    topup: { status: firstResult.status, error: firstResult.error_message || null },
                    processing: true
                }
            });
        }


        // 4a) First attempt OK → capture Stripe immediately
        const cap = await stripeProvider.captureIntent(intent.provider_ref);
        intent.status = cap.status === "succeeded" ? "succeeded" : cap.status;
        await intent.save();

        order.status = "paid"; // payment captured
        await order.save();
        await audit(userId, "order.paid", "order", order.id);

        // If you consider “airtime delivered” == fulfilled:
        order.status = "fulfilled";
        await order.save();
        await audit(userId, "order.fulfilled", "order", order.id);

        // Recurring topups:
        async function maybeCreateRecurringSchedule({ firstAttemptStatus }) {
            // Only when user is logged in AND recurring requested
            if (!isLoggedIn || !recurring || !recurring.frequency) return;

            // Save both AFN+USD from the item line (whatever you priced)
            // For custom, your priceItems already set these:
            const afnMinor = Number(item.unit_price_minor);
            const usdMinor = item.display_usd_minor == null ? null : Number(item.display_usd_minor);
            const isCustom = !!item.is_custom_amount;

            // Ensure a Stripe customer exists, ask Stripe to remember PM (off-session)
            let stripeCustomer = await stripeProvider.getOrCreateCustomer({
                email: req.user?.email ?? order.email ?? null,
                user_id: userId,
            });

            // We just created a PI; fetch its PM so we can persist it
            const pi = await stripeProvider.getIntent(intent.provider_ref);
            const pmId = pi.payment_method || null;

            // First run baseline: if the very first top-up failed, we can still schedule
            const freq = String(recurring.frequency || "").toLowerCase();
            const periodic = ["weekly", "monthly", "quarterly", "yearly"].includes(freq);
            const nextRun = computeNextRunAt({
                // for periodic recurrences, always compute from "now"
                from: new Date(),
                // only pass start_at for one-off 'date'
                start_at: periodic ? null : (recurring.start_at ?? null),
                frequency: freq || "monthly",
            });

            // Ignore existing recurrings
            const existing = await RecurringTopup.findOne({
                where: {
                    user_id: userId,
                    product_variant_id: variant.id,
                    operator_id: item.operator_id || variant.operator_id || null,
                    msisdn: item.msisdn,
                    frequency: recurring.frequency,
                    active: true
                }
            });

            if (existing) {
                return;
            }

            await RecurringTopup.create({
                user_id: userId,
                product_variant_id: variant.id,
                operator_id: item.operator_id || variant.operator_id || null,
                msisdn: item.msisdn,

                is_custom_amount: isCustom,
                amount_afn_minor: Number.isFinite(afnMinor) ? afnMinor : null,
                amount_usd_minor: Number.isFinite(usdMinor) ? usdMinor : null,
                currency: "AFN",

                frequency: recurring.frequency,
                next_run_at: nextRun,
                scheduled_date: recurring.frequency === "date" ? nextRun : null,
                active: true,

                stripe_customer_id: stripeCustomer || null,
                stripe_payment_method_id: pmId || null,

                last_run_at: null,
                last_error: null,
            });
        }
        await maybeCreateRecurringSchedule({ firstAttemptStatus: "delivered" });
        return res.status(200).json({
            data: { order, payment_intent: intent, topup: { status: "delivered" } }
        });
    } catch (e) {
        next(e);
    }
});

// POST /api/checkout/stripe/complete
// body: { intent_id: string, order_id: string }
// routes/checkout.js  (replace the /stripe/complete handler)
checkoutRouter.post("/stripe/complete", optionalAuth, useIdempotency, async (req, res, next) => {
    try {
        const { intent_id, order_id } = req.body || {};
        if (!intent_id || !order_id) return res.status(400).json({ error: "intent_id and order_id required" });

        const order = await Order.findByPk(order_id);
        if (!order) return res.status(404).json({ error: "order not found" });

        // 1) Try “best effort” find
        let intent = await PaymentIntent.findOne({
            where: { order_id, provider: "stripe" },
            order: [["createdAt", "DESC"]],
        });

        // 2) If not present or different provider_ref → fetch from Stripe and upsert
        if (!intent || intent.provider_ref !== intent_id) {
            const pi = await stripeProvider.getIntent(intent_id); // returns Stripe PI object
            if (!pi || pi.object !== "payment_intent") {
                return res.status(404).json({ error: "payment_intent not found" });
            }

            if (!intent) {
                intent = await PaymentIntent.create({
                    user_id: order.user_id,
                    order_id: order.id,
                    provider: "stripe",
                    provider_ref: pi.id,
                    amount_minor: String(pi.amount),
                    currency: String(pi.currency || "usd").toUpperCase(),
                    status: pi.status === "requires_capture" ? "pending" : "created",
                });
            } else {
                intent.provider_ref = pi.id;
                intent.amount_minor = String(pi.amount);
                intent.currency = String(pi.currency || "usd").toUpperCase();
                await intent.save();
            }
        }

        // 3) Must be authorized now
        const current = await stripeProvider.getIntent(intent.provider_ref);
        if (current.status !== "requires_capture") {
            return res.status(409).json({ error: `unexpected intent status: ${current.status}` });
        }

        // Re-run topup & capture (same as before) ...
        const item = await OrderItem.findOne({ where: { order_id }, order: [["createdAt", "ASC"]] });
        const variant = await ProductVariant.findByPk(item.product_variant_id);
        const provider = await pickTopupProvider(item.operator_id);
        const extId = `ord${order.id}-item${item.id}`;

        const firstResult = await provider.topup({ order, item, variant, externalId: extId });
        await TopupLog.create({
            order_item_id: item.id,
            provider: provider.name,
            operator_id: item.operator_id || null,
            msisdn: item.msisdn || null,
            request_payload: firstResult.request, response_payload: firstResult.response,
            status: firstResult.status,
            provider_txn_id: firstResult.provider_txn_id || extId,
            error_code: firstResult.error_code || null,
            error_message: firstResult.error_message || null
        });

        if (firstResult.status !== "accepted" && firstResult.status !== "delivered") {
            await scheduleTopupRetry({
                order_id: order.id, order_item_id: item.id,
                intent_provider: "stripe", intent_ref: intent.provider_ref, next_try: 1
            });
            // return res.status(202).json({ data: { order, payment_intent: intent, processing: true } });
            return res.status(202).json({
                data: {
                    order,
                    payment_intent: intent,
                    topup: {
                        status: firstResult.status,
                        error_code: firstResult.error_code || null,
                        error_message: firstResult.error_message || null,
                    },
                    processing: true,
                }
            });
        }

        // Capture now
        const cap = await stripeProvider.captureIntent(intent.provider_ref);
        intent.status = cap.status === "succeeded" ? "succeeded" : cap.status;
        await intent.save();

        order.status = "paid"; await order.save();
        await audit(req.user?.id ?? null, "order.paid", "order", order.id);

        order.status = "fulfilled"; await order.save();
        await audit(req.user?.id ?? null, "order.fulfilled", "order", order.id);

        return res.json({ data: { order, payment_intent: intent, topup: { status: "delivered" } } });
    } catch (e) { next(e); }
});

checkoutRouter.get("/orders/:id/status", optionalAuth, async (req, res, next) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: "order_not_found" });

        const pi = await PaymentIntent.findOne({
            where: { order_id: order.id, provider: "stripe" },
            order: [["createdAt", "DESC"]],
        });

        const item = await OrderItem.findOne({
            where: { order_id: order.id },
            order: [["createdAt", "ASC"]],
        });

        // latest top-up attempt (if any)
        const log = item
            ? await TopupLog.findOne({
                where: { order_item_id: item.id },
                order: [["createdAt", "DESC"]],
            })
            : null;

        const variant = item ? await ProductVariant.findByPk(item.product_variant_id) : null;

        // derive a simple state for the UI
        const last = log?.status || null;
        const delivered = last === "delivered" || last === "accepted";
        const failed = last === "failed" || last === "rejected" || last === "cancelled";
        const processing =
            !delivered && !failed && (order.status === "created" || order.status === "paid");

        return res.json({
            data: {
                order: { id: order.id, status: order.status, order_no: order.order_no },
                payment_intent: pi
                    ? { status: pi.status, provider_ref: pi.provider_ref, currency: pi.currency, amount_minor: pi.amount_minor }
                    : null,
                item: item
                    ? {
                        id: item.id,
                        msisdn: item.msisdn,
                        product_variant_id: item.product_variant_id,
                        name: variant?.name || null,
                    }
                    : null,
                topup: log
                    ? {
                        last_status: log.status,
                        error_code: log.error_code || null,
                        error_message: log.error_message || null,
                        attempts: 1, // (bump if you track more)
                        created_at: log.createdAt,
                    }
                    : null,
                processing,
                delivered,
                failed,
            },
        });
    } catch (e) {
        next(e);
    }
});