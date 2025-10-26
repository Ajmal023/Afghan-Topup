import { Router } from "express";
import { Op } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { RecurringTopup, ProductVariant, Operator } from "../models/index.js";
import { computeNextRunAt } from "../services/recurring/computeNextRunAt.js";

export const recurringTopupsRouter = Router();

/* -------------------- CUSTOMER -------------------- */
recurringTopupsRouter.get("/customer/recurring-topups", requireAuth, async (req, res, next) => {
    try {
        const rows = await RecurringTopup.findAll({
            where: { user_id: req.user.id },
            include: [
                { model: ProductVariant, attributes: ["id", "name", "code"] },
                { model: Operator, attributes: ["id", "code", "name"] },
            ],
            order: [["createdAt", "DESC"]],
        });
        res.json({ data: rows });
    } catch (e) { next(e); }
});

recurringTopupsRouter.post("/customer/recurring-topups", requireAuth, async (req, res, next) => {
    try {
        const b = req.body || {};
        if (!b.product_variant_id || !b.msisdn || !b.frequency)
            return res.status(400).json({ error: "product_variant_id, msisdn, frequency required" });

        const next = computeNextRunAt({
            from: new Date(),
            frequency: b.frequency,
            start_at: b.start_at ?? null,
        });
        const row = await RecurringTopup.create({
            user_id: req.user.id,
            product_variant_id: b.product_variant_id,
            operator_id: b.operator_id || null,
            msisdn: b.msisdn,

            is_custom_amount: !!b.is_custom_amount,
            amount_afn_minor: b.amount_afn_minor ?? null,
            amount_usd_minor: b.amount_usd_minor ?? null,
            currency: "AFN",

            frequency: b.frequency,
            next_run_at: next,
            scheduled_date: b.frequency === "date" ? next : null,
            active: true,

            stripe_customer_id: b.stripe_customer_id || null,
            stripe_payment_method_id: b.stripe_payment_method_id || null,
        });

        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

recurringTopupsRouter.patch("/customer/recurring-topups/:id", requireAuth, async (req, res, next) => {
    try {
        const r = await RecurringTopup.findByPk(req.params.id);
        if (!r || r.user_id !== req.user.id) return res.status(404).json({ error: "not found" });

        const { frequency, start_at, active, msisdn, amount_afn_minor, amount_usd_minor } = req.body || {};
        if (frequency) {
            r.frequency = frequency;
            const nxt = computeNextRunAt({
                from: new Date(),
                frequency,
                start_at: start_at ?? null,
            });
            r.next_run_at = nxt;
            r.scheduled_date = frequency === "date" ? nxt : null;
        }
        if (typeof active === "boolean") r.active = active;
        if (msisdn) r.msisdn = msisdn;
        if (amount_afn_minor != null) r.amount_afn_minor = Number(amount_afn_minor);
        if (amount_usd_minor != null) r.amount_usd_minor = Number(amount_usd_minor);
        await r.save();

        res.json({ data: r });
    } catch (e) { next(e); }
});

recurringTopupsRouter.delete("/customer/recurring-topups/:id", requireAuth, async (req, res, next) => {
    try {
        const r = await RecurringTopup.findByPk(req.params.id);
        if (!r || r.user_id !== req.user.id) return res.status(404).json({ error: "not found" });
        r.active = false;
        await r.save();
        res.json({ data: r });
    } catch (e) { next(e); }
});

/* -------------------- ADMIN -------------------- */
recurringTopupsRouter.get("/admin/recurring-topups", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { user, msisdn, active } = req.query || {};
        const where = {};
        if (user) where.user_id = user;
        if (msisdn) where.msisdn = msisdn;
        if (active != null) where.active = String(active) === "true";

        const rows = await RecurringTopup.findAll({
            where,
            include: [
                { model: ProductVariant, attributes: ["id", "name", "code"] },
                { model: Operator, attributes: ["id", "code", "name"] },
            ],
            order: [["next_run_at", "ASC"]],
            limit: 500,
        });
        res.json({ data: rows });
    } catch (e) { next(e); }
});

recurringTopupsRouter.patch("/admin/recurring-topups/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const r = await RecurringTopup.findByPk(req.params.id);
        if (!r) return res.status(404).json({ error: "not found" });

        const { active, next_run_at } = req.body || {};
        if (typeof active === "boolean") r.active = active;
        if (next_run_at) r.next_run_at = new Date(next_run_at);
        await r.save();
        res.json({ data: r });
    } catch (e) { next(e); }
});
