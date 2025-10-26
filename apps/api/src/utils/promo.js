// utils/promo.js
import { Op } from "sequelize";
import { PromoCode, PromoUse, PromoAudience, User } from "../models/index.js";
import { hasUsedPromoOrAliases, normalizeMsisdn, resolveAliasUserIds } from "./eligibility.js";

export function computePromoDiscount({ promo, orderTotalMinor, currency }) {
    if (promo.type === "percent") {
        return Math.floor((Number(promo.value) / 100) * orderTotalMinor);
    }
    if (promo.type === "fixed") {
        if (promo.currency !== currency) return 0;
        return Math.min(orderTotalMinor, Math.round(Number(promo.value) * 100)); // assuming minor = cents/afn*100
    }
    return 0;
}

export async function checkPromoEligibility({ promo, userId, msisdn, orderTotalMinor, currency, transaction }) {
    if (!promo.active) return { ok: false, reason: "inactive" };
    const now = new Date();
    if (promo.start_at && new Date(promo.start_at) > now) return { ok: false, reason: "not_started" };
    if (promo.end_at && new Date(promo.end_at) < now) return { ok: false, reason: "expired" };
    if (promo.type === "fixed" && promo.currency !== currency) return { ok: false, reason: "currency_mismatch" };
    if (promo.min_order_amount_minor && orderTotalMinor < promo.min_order_amount_minor) {
        return { ok: false, reason: "min_order_not_met" };
    }
    if (promo.max_uses != null) {
        const total = await PromoUse.count({ where: { promo_code_id: promo.id }, transaction });
        if (total >= promo.max_uses) return { ok: false, reason: "max_uses_reached" };
    }
    if (promo.max_uses_per_user != null) {
        const ids = await resolveAliasUserIds({ userId, msisdn });
        const perUser = await PromoUse.count({
            where: { promo_code_id: promo.id, user_id: { [Op.in]: [...ids] } }, transaction
        });
        if (perUser >= promo.max_uses_per_user) return { ok: false, reason: "per_user_limit" };
    }
    // Optional allow-list enforcement
    const audienceExists = await PromoAudience?.count?.({ where: { promo_code_id: promo.id }, transaction });
    if (audienceExists) {
        const user = await User.findByPk(userId, { attributes: ["email", "msisdn"], transaction });
        const normMsisdn = normalizeMsisdn(msisdn || user?.msisdn);
        const email = (user?.email || "").toLowerCase();
        const allowed = await PromoAudience.count({
            where: {
                promo_code_id: promo.id,
                [Op.or]: [
                    ...(normMsisdn ? [{ msisdn: normMsisdn }] : []),
                    ...(email ? [{ email }] : [])
                ]
            }, transaction
        });
        if (!allowed) return { ok: false, reason: "not_in_audience" };
    }

    const reused = await hasUsedPromoOrAliases({ promo_code_id: promo.id, userId, msisdn });
    if (reused) return { ok: false, reason: "already_used" };

    return { ok: true };
}

export async function recordPromoUseTx({ promo, userId, orderId, amountDiscountMinor, currency, transaction }) {
    // idempotent per (promo_code_id, user_id, order_id)
    const [row] = await PromoUse.findOrCreate({
        where: { promo_code_id: promo.id, user_id: userId, order_id: orderId },
        defaults: {
            promo_code_id: promo.id,
            user_id: userId,
            order_id: orderId,
            amount_discount_minor: amountDiscountMinor,
            currency
        },
        transaction
    });
    return row;
}
