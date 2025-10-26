import { Router } from "express";
import { ProductVariant, Product, OrderItem } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const variantsRouter = Router();

// Create
variantsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { product_id, name, amount_minor, currency = "AFN", operator_id = null, code = null, is_active = true, display_usd_minor = null,
            display_usd_rate_to_base = null, is_custom_amount = false } = req.body || {};
        if (!product_id || !name) {
            return res.status(400).json({ error: "product_id, name required" });
        }
        const product = await Product.findByPk(product_id);
        if (!product) return res.status(400).json({ error: "product not found" });

        const row = await ProductVariant.create({ product_id, name, amount_minor, currency, operator_id, code, is_active: !!is_active, display_usd_minor, display_usd_rate_to_base, is_custom_amount: !!is_custom_amount });
        await audit(req.user.id, "variant.create", "product_variant", row.id, { product_id, name, amount_minor, currency });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

// Update
variantsRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await ProductVariant.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = { name: row.name, amount_minor: row.amount_minor, currency: row.currency, operator_id: row.operator_id, is_active: row.is_active, code: row.code };
        const { name, amount_minor, currency, operator_id, is_active, code, display_usd_minor, display_usd_rate_to_base, is_custom_amount, } = req.body || {};
        if (name !== undefined) row.name = name;
        if (amount_minor !== undefined) row.amount_minor = amount_minor;
        if (currency !== undefined) row.currency = currency;
        if (operator_id !== undefined) row.operator_id = operator_id;
        if (is_active !== undefined) row.is_active = !!is_active;
        if (code !== undefined) row.code = code;
        let touchedDisplay = false;
        if (display_usd_minor !== undefined) { row.display_usd_minor = display_usd_minor; touchedDisplay = true; }
        if (display_usd_rate_to_base !== undefined) { row.display_usd_rate_to_base = display_usd_rate_to_base; touchedDisplay = true; }
        if (touchedDisplay) row.display_usd_synced_at = new Date();
        if (row.is_custom_amount) {
            // ignore/clear fixed AFN amount for custom
            row.amount_minor = null;
        } else if (amount_minor !== undefined) {
            row.amount_minor = amount_minor;
        }

        await row.save();
        await audit(req.user.id, "variant.update", "product_variant", row.id, { before, after: { name: row.name, amount_minor: row.amount_minor, currency: row.currency, operator_id: row.operator_id, is_active: row.is_active, code: row.code } });
        res.json({ data: row });
    } catch (e) { next(e); }
});

// Delete with guard (if referenced by OrderItem)
variantsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const count = await OrderItem.count({ where: { product_variant_id: req.params.id } });
        if (count > 0) return res.status(400).json({ error: "cannot delete variant referenced by orders" });
        const row = await ProductVariant.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        await row.destroy();
        await audit(req.user.id, "variant.delete", "product_variant", row.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});
