import { Router } from "express";
import { Op } from "sequelize";
import { ReferralCode, ReferralUse, User } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const referralsRouter = Router();


referralsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { code, owner_user_id = null, max_uses = null, max_uses_per_user = null, start_at = null, end_at = null, active = true, notes } = req.body || {};
        if (!code) return res.status(400).json({ error: "code required" });
        const dup = await ReferralCode.findOne({ where: { code } });
        if (dup) return res.status(409).json({ error: "code exists" });

        const row = await ReferralCode.create({ code, owner_user_id, max_uses, max_uses_per_user, start_at, end_at, active, notes });
        await audit(req.user.id, "referral.create", "referral_code", row.id, { code });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});


referralsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { q, active, owner, from, to, page = 1, limit = 20 } = req.query;
        const where = {};
        if (q) where.code = { [Op.iLike]: `%${q}%` };
        if (active !== undefined) where.active = active === "true";
        if (owner) where.owner_user_id = owner;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await ReferralCode.findAndCountAll({
            where, order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

// Update
referralsRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await ReferralCode.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = row.toJSON();
        const { active, max_uses, max_uses_per_user, start_at, end_at, owner_user_id, notes } = req.body || {};
        if (active !== undefined) row.active = !!active;
        if (max_uses !== undefined) row.max_uses = max_uses;
        if (max_uses_per_user !== undefined) row.max_uses_per_user = max_uses_per_user;
        if (start_at !== undefined) row.start_at = start_at;
        if (end_at !== undefined) row.end_at = end_at;
        if (owner_user_id !== undefined) row.owner_user_id = owner_user_id;
        if (notes !== undefined) row.notes = notes;
        await row.save();
        await audit(req.user.id, "referral.update", "referral_code", row.id, { before, after: row.toJSON() });
        res.json({ data: row });
    } catch (e) { next(e); }
});

// Get or create my referral code
referralsRouter.post("/me/code", requireAuth, async (req, res, next) => {
    try {
        let codeRow = await ReferralCode.findOne({ where: { owner_user_id: req.user.id, active: true } });
        if (!codeRow) {
            codeRow = await ReferralCode.create({
                owner_user_id: req.user.id,
                code: `REF-${uuid().slice(0, 8).toUpperCase()}`,
                active: true, max_uses: null, expires_at: null
            });
            await audit(req.user.id, "referral.create_code", "referral_code", codeRow.id);
        }
        res.json({ data: codeRow });
    } catch (e) { next(e); }
});

// Apply a referral code (usually on sign-up or first order)
referralsRouter.post("/apply", requireAuth, async (req, res, next) => {
    try {
        const { code, order_id = null, msisdn } = req.body || {};
        if (!code) return res.status(400).json({ error: "code required" });

        const row = await ReferralCode.findOne({ where: { code, active: true } });
        if (!row) return res.status(404).json({ error: "invalid_code" });

        if (row.owner_user_id === req.user.id) return res.status(400).json({ error: "self_referral_disallowed" });

        // one referral per referred_user
        const existing = await ReferralUse.findOne({ where: { referred_user_id: req.user.id } });
        if (existing) return res.status(400).json({ error: "already_referred" });

        // alias check (same msisdn/email accounts already used this referrer)
        const reused = await hasUsedReferralOrAliases({
            referral_code_id: row.id, referred_user_id: req.user.id, msisdn
        });
        if (reused) return res.status(400).json({ error: "alias_already_used" });

        // optional cap and expiry
        if (row.expires_at && new Date(row.expires_at) < new Date()) return res.status(400).json({ error: "expired" });
        if (row.max_uses != null) {
            const count = await ReferralUse.count({ where: { referral_code_id: row.id } });
            if (count >= row.max_uses) return res.status(400).json({ error: "max_uses_reached" });
        }

        const use = await ReferralUse.create({
            referral_code_id: row.id,
            referrer_user_id: row.owner_user_id,
            referred_user_id: req.user.id,
            order_id
        });
        await audit(req.user.id, "referral.apply", "referral_code", row.id, { order_id });
        res.status(201).json({ ok: true, data: use });
    } catch (e) { next(e); }
});

// Admin: list uses
referralsRouter.get("/uses", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { code, page = 1, limit = 20 } = req.query;
        const include = [];
        if (code) include.push({ model: ReferralCode, as: "code", where: { code } });
        else include.push({ model: ReferralCode, as: "code" });

        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await ReferralUse.findAndCountAll({
            include, order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});