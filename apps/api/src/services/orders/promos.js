import { Op } from "sequelize";
import { PromoCode, PromoUse } from "../../models/index.js";

export async function applyPromo({ code, userId, orderTotalMinor }) {
    if (!code) return { discount_minor: 0, currency: "AFN", promo: null };
    const now = new Date();
    const promo = await PromoCode.findOne({
        where: {
            code,
            active: true,
            [Op.or]: [{ start_at: null }, { start_at: { [Op.lte]: now } }],
            [Op.or]: [{ end_at: null }, { end_at: { [Op.gte]: now } }]
        }
    });
    if (!promo) throw new Error("Promo invalid/expired");
    if (promo.min_order_amount_minor && orderTotalMinor < Number(promo.min_order_amount_minor)) {
        throw new Error("Order below promo minimum");
    }
    // usage caps
    const totalUses = await PromoUse.count({ where: { promo_code_id: promo.id } });
    if (promo.max_uses && totalUses >= promo.max_uses) throw new Error("Promo uses exceeded");
    if (userId) {
        const userUses = await PromoUse.count({ where: { promo_code_id: promo.id, user_id: userId } });
        if (promo.max_uses_per_user && userUses >= promo.max_uses_per_user) throw new Error("Per-user cap exceeded");
    }

    // compute discount
    let discount_minor = 0;
    if (promo.type === "percent") {
        discount_minor = Math.floor(Number(orderTotalMinor) * Number(promo.value) / 100);
    } else if (promo.type === "fixed") {
        if ((promo.currency || "AFN") !== "AFN") throw new Error("Promo currency mismatch");
        discount_minor = Math.min(Number(orderTotalMinor), Math.round(Number(promo.value) * 1)); // AFN has 0 decimals now
    } else {
        throw new Error("Unsupported promo type");
    }
    return { discount_minor, currency: "AFN", promo };
}
