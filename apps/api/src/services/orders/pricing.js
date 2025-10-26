// services/orders/pricing.js
import { ProductVariant, Operator } from "../../models/index.js";

// stub – plug in your real FX source; returns AFN→USD (e.g. 0.012)
async function getAfnToUsdRate() {
    // e.g., from cache or DB
    return 0.012;
}

export async function priceItems(items = []) {
    const result = { items: [], total_minor: 0 };

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("items required");
    }

    for (const raw of items) {
        const v = await ProductVariant.findByPk(raw.product_variant_id);
        if (!v || !v.is_active) throw new Error("Variant not found");

        const qty = Number(raw.quantity ?? 1);
        if (!Number.isInteger(qty) || qty < 1) throw new Error("Bad quantity");
        // prefer request operator -> variant operator -> null
        const operator_id = v.dataValues.operator_id ?? null;
        if (operator_id) await Operator.findByPk(operator_id).catch(() => null);

        let unit_price_minor;          // AFN minor (per unit)
        let display_usd_minor = null;  // USD minor (per unit)
        let fx_snapshot = null;
        const is_custom_amount = !!v.is_custom_amount;
        let customer_entered_usd_minor = null;

        if (is_custom_amount) {
            // Accept either/both overrides
            const usdOverride = raw.customer_entered_usd_minor;
            const afnOverride = raw.unit_price_minor_override;

            if (
                (usdOverride == null || !Number.isFinite(Number(usdOverride))) &&
                (afnOverride == null || !Number.isFinite(Number(afnOverride)))
            ) {
                throw new Error("Custom amount required (USD or AFN)");
            }

            if (usdOverride != null) {
                const n = Math.trunc(Number(usdOverride));
                if (n <= 0) throw new Error("Invalid USD amount");
                display_usd_minor = n;
                customer_entered_usd_minor = n;
            }
            if (afnOverride != null) {
                const n = Math.trunc(Number(afnOverride));
                if (n <= 0) throw new Error("Invalid AFN amount");
                unit_price_minor = n;
            }

            // Derive the missing side via FX (minor→minor)
            if (unit_price_minor == null) {
                const afn = await convertMinor(BigInt(display_usd_minor), "USD", "AFN");
                unit_price_minor = Number(afn);
            }
            if (display_usd_minor == null) {
                const usd = await convertMinor(BigInt(unit_price_minor), "AFN", "USD");
                display_usd_minor = Number(usd);
                // (optional) don’t set customer_entered_usd_minor if it was derived
            }

            fx_snapshot = display_usd_minor / unit_price_minor; // minor/minor ratio
        } else {
            // Fixed-price variant
            unit_price_minor = Number(v.amount_minor);
            if (!Number.isFinite(unit_price_minor) || unit_price_minor <= 0) {
                throw new Error("Variant price missing");
            }
            display_usd_minor =
                v.display_usd_minor == null ? null : Number(v.display_usd_minor);

            fx_snapshot =
                v.display_usd_rate_to_base == null
                    ? display_usd_minor != null
                        ? display_usd_minor / unit_price_minor
                        : null
                    : Number(v.display_usd_rate_to_base);
        }

        const line = {
            order_id: null, // filled by caller
            product_variant_id: v.id,
            quantity: qty,
            unit_price_minor,                 // AFN minor
            currency: "AFN",
            msisdn: raw.msisdn ?? null,
            operator_id,
            display_usd_minor,                // USD minor
            fx_rate_to_usd_snapshot: fx_snapshot,
            is_custom_amount,
            customer_entered_usd_minor,
        };

        result.items.push(line);
        result.total_minor += unit_price_minor * qty;
    }

    return result;
}