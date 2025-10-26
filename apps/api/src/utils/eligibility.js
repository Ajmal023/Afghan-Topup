// utils/eligibility.js
import { Op } from "sequelize";
import { User, PromoUse, ReferralUse } from "../models/index.js";

export function normalizeMsisdn(msisdn) {
    if (!msisdn) return null;
    return msisdn.replace(/[^\d]/g, "").replace(/^00/, "").replace(/^0(7)/, "93$1"); // example AFN-ish normalization
}

export async function resolveAliasUserIds({ userId, msisdn, email }) {
    const where = { [Op.or]: [{ id: userId }] };
    if (msisdn) where[Op.or].push({ msisdn: normalizeMsisdn(msisdn) });
    if (email) where[Op.or].push({ email: { [Op.iLike]: email } });

    const seeds = await User.findAll({ where, attributes: ["id", "email", "msisdn"] });
    const normMsisdns = new Set(seeds.map(u => normalizeMsisdn(u.msisdn)).filter(Boolean));
    const emails = new Set(seeds.map(u => (u.email || "").toLowerCase()).filter(Boolean));

    const all = await User.findAll({
        where: {
            [Op.or]: [
                { id: { [Op.in]: seeds.map(s => s.id) } },
                ...(normMsisdns.size ? [{ msisdn: { [Op.in]: [...normMsisdns] } }] : []),
                ...(emails.size ? [{ email: { [Op.in]: [...emails] } }] : [])
            ]
        },
        attributes: ["id"]
    });

    return new Set(all.map(u => u.id));
}

export async function hasUsedPromoOrAliases({ promo_code_id, userId, msisdn, email }) {
    const ids = await resolveAliasUserIds({ userId, msisdn, email });
    const count = await PromoUse.count({ where: { promo_code_id, user_id: { [Op.in]: [...ids] } } });
    return count > 0;
}

export async function hasUsedReferralOrAliases({ referral_code_id, referred_user_id, msisdn }) {
    // make sure none of the alias accounts already used this referral
    const ids = await resolveAliasUserIds({ userId: referred_user_id, msisdn });
    const count = await ReferralUse.count({ where: { referral_code_id, referred_user_id: { [Op.in]: [...ids] } } });
    return count > 0;
}
