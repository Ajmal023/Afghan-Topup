import { Router } from "express";
import { Op, Sequelize } from "sequelize";
import { PromoCode, PromoUse, User } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";
import { checkPromoEligibility, computePromoDiscount, recordPromoUseTx } from "../utils/promo.js";

export const promosRouter = Router();

// Create
promosRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const {
            code, type, value, currency = null,
            start_at = null, end_at = null,
            max_uses = null, max_uses_per_user = null,
            min_order_amount_minor = null,
            description = null, active = true
        } = req.body || {};

        if (!code || !type || value == null) return res.status(400).json({ error: "code, type, value required" });
        if (!["percent", "fixed"].includes(type)) return res.status(400).json({ error: "type must be percent|fixed" });
        if (type === "fixed" && !currency) return res.status(400).json({ error: "fixed promos require currency" });

        const dup = await PromoCode.findOne({ where: { code } });
        if (dup) return res.status(409).json({ error: "code exists" });

        const row = await PromoCode.create({
            code, type, value, currency, start_at, end_at,
            max_uses, max_uses_per_user, min_order_amount_minor,
            description, active
        });

        await audit(req.user.id, "promo.create", "promo_code", row.id, { code, type, value });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

// List/filter
promosRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { q, active, from, to, page = 1, limit = 20 } = req.query;
        const where = {};
        if (q) where.code = { [Op.iLike]: `%${q}%` };
        if (active !== undefined) where.active = active === "true";
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await PromoCode.findAndCountAll({
            where, order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

// Update
promosRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await PromoCode.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = row.toJSON();
        const {
            type, value, currency,
            start_at, end_at,
            max_uses, max_uses_per_user,
            min_order_amount_minor,
            description, active
        } = req.body || {};

        if (type && !["percent", "fixed"].includes(type)) return res.status(400).json({ error: "invalid type" });
        if (type === "fixed" && currency === undefined && !row.currency) return res.status(400).json({ error: "fixed promos require currency" });

        if (type !== undefined) row.type = type;
        if (value !== undefined) row.value = value;
        if (currency !== undefined) row.currency = currency;
        if (start_at !== undefined) row.start_at = start_at;
        if (end_at !== undefined) row.end_at = end_at;
        if (max_uses !== undefined) row.max_uses = max_uses;
        if (max_uses_per_user !== undefined) row.max_uses_per_user = max_uses_per_user;
        if (min_order_amount_minor !== undefined) row.min_order_amount_minor = min_order_amount_minor;
        if (description !== undefined) row.description = description;
        if (active !== undefined) row.active = !!active;

        await row.save();
        await audit(req.user.id, "promo.update", "promo_code", row.id, { before, after: row.toJSON() });
        res.json({ data: row });
    } catch (e) { next(e); }
});

// Delete (soft if no uses)
promosRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const uses = await PromoUse.count({ where: { promo_code_id: req.params.id } });
        if (uses > 0) return res.status(400).json({ error: "cannot delete promo with uses" });
        const row = await PromoCode.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        await row.destroy(); // if paranoid enabled, this is soft
        await audit(req.user.id, "promo.delete", "promo_code", row.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

promosRouter.get("/uses", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { code, user_id, order_id, page = 1, limit = 20 } = req.query;
        const where = {};
        if (order_id) where.order_id = order_id;
        if (user_id) where.user_id = user_id;

        // If filtering by code, join through PromoCode
        const include = [];
        if (code) {
            include.push({ model: PromoCode, as: "promo", where: { code } });
        } else {
            include.push({ model: PromoCode, as: "promo" });
        }

        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await PromoUse.findAndCountAll({
            where, include, order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });

        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

// 👤 List my uses (self)
promosRouter.get("/me/uses", requireAuth, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await PromoUse.findAndCountAll({
            where: { user_id: req.user.id },
            include: [{ model: PromoCode, as: "promo" }],
            order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

// routes/promos.js (more additions)

// ✅ Validate/apply (no write)
promosRouter.post("/apply", requireAuth, async (req, res, next) => {
    try {
        const { code, order_total_minor, currency, msisdn } = req.body || {};
        if (!code || order_total_minor == null || !currency) {
            return res.status(400).json({ error: "code, order_total_minor, currency required" });
        }

        const promo = await PromoCode.findOne({ where: { code } });
        if (!promo) return res.status(404).json({ error: "invalid_code" });

        const eligible = await checkPromoEligibility({
            promo, userId: req.user.id, msisdn, orderTotalMinor: Number(order_total_minor), currency
        });
        if (!eligible.ok) return res.status(400).json({ error: eligible.reason });

        const discount_minor = computePromoDiscount({ promo, orderTotalMinor: Number(order_total_minor), currency });
        res.json({ ok: true, data: { discount_minor, currency, promo_id: promo.id } });
    } catch (e) { next(e); }
});

// 🧾 Consume (record after payment success)
promosRouter.post("/consume", requireAuth, async (req, res, next) => {
    const t = await PromoCode.sequelize.transaction();
    try {
        const { code, order_id, order_total_minor, currency, msisdn } = req.body || {};
        if (!code || !order_id || order_total_minor == null || !currency) {
            await t.rollback();
            return res.status(400).json({ error: "code, order_id, order_total_minor, currency required" });
        }

        const promo = await PromoCode.findOne({ where: { code }, transaction: t, lock: t.LOCK.UPDATE });
        if (!promo) { await t.rollback(); return res.status(404).json({ error: "invalid_code" }); }

        // re-check eligibility inside TX to avoid races
        const eligible = await checkPromoEligibility({
            promo, userId: req.user.id, msisdn, orderTotalMinor: Number(order_total_minor), currency, transaction: t
        });
        if (!eligible.ok) { await t.rollback(); return res.status(400).json({ error: eligible.reason }); }

        const discount_minor = computePromoDiscount({ promo, orderTotalMinor: Number(order_total_minor), currency });

        const useRow = await recordPromoUseTx({
            promo, userId: req.user.id, orderId: order_id,
            amountDiscountMinor: discount_minor, currency, transaction: t
        });

        await audit(req.user.id, "promo.consume", "promo_code", promo.id, { order_id, discount_minor });
        await t.commit();
        res.status(201).json({ ok: true, data: useRow });
    } catch (e) { try { await t.rollback(); } catch (_) { } next(e); }
});
