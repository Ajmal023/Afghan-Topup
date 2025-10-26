// routes/incentives.js
import { Router } from "express";
import { IncentiveRequest, IncentiveRecipient, PromoCode, ReferralCode, PromoAudience, ReferralAudience } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const incentivesRouter = Router();

// Top customer submits request with recipients
// body: { type: "promo"|"referral", name, payload?, recipients: [{email?, msisdn?}, ...] }
incentivesRouter.post("/requests", requireAuth, async (req, res, next) => {
    try {
        const { type, name, payload = {}, recipients = [] } = req.body || {};
        if (!["promo", "referral"].includes(type) || !name) {
            return res.status(400).json({ error: "type (promo|referral) and name required" });
        }
        const reqRow = await IncentiveRequest.create({
            requester_user_id: req.user.id, type, name, payload, status: "pending"
        });
        if (Array.isArray(recipients) && recipients.length) {
            await IncentiveRecipient.bulkCreate(recipients.map(r => ({
                request_id: reqRow.id, email: r.email || null, msisdn: r.msisdn || null
            })));
        }
        await audit(req.user.id, "incentive.request.create", "incentive_request", reqRow.id, { type, name });
        res.status(201).json({ data: reqRow });
    } catch (e) { next(e); }
});

// Admin: review/approve or reject
// body: { approve: true|false, notes?, promoConfig? / referralConfig? , restrictToRecipients?: boolean }
incentivesRouter.post("/requests/:id/decision", requireAuth, requireRole("admin"), async (req, res, next) => {
    const t = await IncentiveRequest.sequelize.transaction();
    try {
        const { approve, notes, restrictToRecipients = true } = req.body || {};
        const row = await IncentiveRequest.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!row) { await t.rollback(); return res.status(404).json({ error: "not_found" }); }
        if (row.status !== "pending") { await t.rollback(); return res.status(400).json({ error: "already_decided" }); }

        let resultId = null;

        if (approve) {
            if (row.type === "promo") {
                const cfg = req.body.promoConfig || row.payload || {};
                // cfg: { code, type, value, currency, start_at?, end_at?, max_uses?, max_uses_per_user?, min_order_amount_minor?, description?, active? }
                if (!cfg.code || !cfg.type || cfg.value == null) { await t.rollback(); return res.status(400).json({ error: "promoConfig incomplete" }); }
                const promo = await PromoCode.create(cfg, { transaction: t });
                resultId = promo.id;

                if (restrictToRecipients) {
                    const recips = await IncentiveRecipient.findAll({ where: { request_id: row.id }, transaction: t });
                    if (recips.length) {
                        await PromoAudience.bulkCreate(recips.map(r => ({
                            promo_code_id: promo.id, email: r.email || null, msisdn: r.msisdn || null
                        })), { transaction: t });
                    }
                }
            } else {
                const cfg = req.body.referralConfig || row.payload || {};
                // cfg: { code?, owner_user_id, max_uses?, expires_at?, active? }
                if (!cfg.owner_user_id) { await t.rollback(); return res.status(400).json({ error: "referralConfig needs owner_user_id" }); }
                if (!cfg.code) cfg.code = `REF-${row.id.slice(0, 8).toUpperCase()}`;
                const ref = await ReferralCode.create({ active: true, ...cfg }, { transaction: t });
                resultId = ref.id;

                if (restrictToRecipients) {
                    const recips = await IncentiveRecipient.findAll({ where: { request_id: row.id }, transaction: t });
                    if (recips.length) {
                        await ReferralAudience.bulkCreate(recips.map(r => ({
                            referral_code_id: ref.id, email: r.email || null, msisdn: r.msisdn || null
                        })), { transaction: t });
                    }
                }
            }

            row.status = "approved";
            row.result_code_id = resultId;
            row.decided_by_user_id = req.user.id;
            row.decided_at = new Date();
            row.notes = notes || null;
            await row.save({ transaction: t });
            await audit(req.user.id, "incentive.request.approve", "incentive_request", row.id, { resultId });
        } else {
            row.status = "rejected";
            row.decided_by_user_id = req.user.id;
            row.decided_at = new Date();
            row.notes = notes || null;
            await row.save({ transaction: t });
            await audit(req.user.id, "incentive.request.reject", "incentive_request", row.id);
        }

        await t.commit();
        res.json({ data: row });
    } catch (e) { try { await t.rollback(); } catch (_) { } next(e); }
});
