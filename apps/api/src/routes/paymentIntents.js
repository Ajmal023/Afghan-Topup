import { Router } from "express";
import { PaymentIntent, Order } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/auth.js";
import { convertMinor } from "../utils/fx.js";
import { audit } from "../services/audit.js";
import { Payments } from "../services/providers/index.js";

export const paymentIntentsRouter = Router();

// Create
paymentIntentsRouter.post("/", requireAuth, async (req, res, next) => {
    try {
        const { order_id, provider } = req.body || {};
        if (!order_id || !provider) return res.status(400).json({ error: "order_id and provider required" });

        const order = await Order.findByPk(order_id);
        if (!order) return res.status(404).json({ error: "order not found" });
        if (req.user.role !== "admin" && order.user_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
        if (["paid", "fulfilled"].includes(order.status)) return res.status(409).json({ error: "order already paid" });

        const p = Payments[provider];
        if (!p) return res.status(400).json({ error: "unsupported provider" });

        // Convert from the order's currency to provider's charge currency (Stripe → USD as example)
        const chargeCurrency = provider === "stripe" ? "USD" : order.currency;
        const chargeMinor = order.currency === chargeCurrency
            ? BigInt(order.total_minor)
            : await convertMinor(BigInt(order.total_minor), order.currency, chargeCurrency);

        // Provider integration (keep minor units as string to avoid precision loss)
        const created = await p.createIntent({
            order,
            amount_minor: chargeMinor.toString(),
            currency: chargeCurrency,
            metadata: {}
        });

        const intent = await PaymentIntent.create({
            user_id: order.user_id,
            order_id: order.id,
            provider,
            amount_minor: created.amount_minor.toString(), // BIGINT-safe
            currency: created.currency,
            status: "created",
            provider_ref: created.provider_ref
        });

        await audit(req.user.id, "payment_intent.create", "payment_intent", intent.id, { provider });

        const next_action =
            provider === "stripe" && created.client_secret
                ? { type: "stripe_client_secret", client_secret: created.client_secret }
                : created.redirect_url
                    ? { type: "redirect", url: created.redirect_url }
                    : { type: "none" };

        res.status(201).json({ data: intent, next_action });
    } catch (e) { next(e); }
});
// List (admin all; user own)
paymentIntentsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const where = {};
        if (req.user.role !== "admin") where.user_id = req.user.id;
        const rows = await PaymentIntent.findAll({ where, order: [["createdAt", "DESC"]] });
        res.json({ data: rows });
    } catch (e) { next(e); }
});

// Get one
paymentIntentsRouter.get("/:id", requireAuth, async (req, res, next) => {
    try {
        const row = await PaymentIntent.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        if (req.user.role !== "admin" && row.user_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
        res.json({ data: row });
    } catch (e) { next(e); }
});

// Cancel pending
paymentIntentsRouter.patch("/:id/cancel", requireAuth, async (req, res, next) => {
    try {
        const row = await PaymentIntent.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        if (req.user.role !== "admin" && row.user_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
        if (row.status !== "created" && row.status !== "pending") return res.status(400).json({ error: "cannot cancel in current state" });
        row.status = "cancelled";
        await row.save();
        await audit(req.user.id, "payment_intent.cancel", "payment_intent", row.id);
        res.json({ data: row });
    } catch (e) { next(e); }
});
