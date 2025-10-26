import { Router } from "express";
import { Product, Category, ProductCategory } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const productCategoriesRouter = Router({ mergeParams: true });

// List categories for product
productCategoriesRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const prod = await Product.findByPk(req.params.id, { include: [{ model: Category, through: { attributes: [] } }] });
        if (!prod) return res.status(404).json({ error: "product not found" });
        res.json({ data: prod.Categories || [] });
    } catch (e) { next(e); }
});

// Attach
productCategoriesRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { category_id } = req.body || {};
        if (!category_id) return res.status(400).json({ error: "category_id required" });
        const prod = await Product.findByPk(req.params.id);
        if (!prod) return res.status(404).json({ error: "product not found" });
        const cat = await Category.findByPk(category_id);
        if (!cat) return res.status(404).json({ error: "category not found" });

        const exists = await ProductCategory.findOne({ where: { product_id: prod.id, category_id } });
        if (exists) return res.status(409).json({ error: "already attached" });

        await ProductCategory.create({ product_id: prod.id, category_id });
        await audit(req.user.id, "product.category.attach", "product", prod.id, { category_id });
        res.status(201).json({ ok: true });
    } catch (e) { next(e); }
});

// Detach
productCategoriesRouter.delete("/:category_id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const prod = await Product.findByPk(req.params.id);
        if (!prod) return res.status(404).json({ error: "product not found" });
        const catId = req.params.category_id;
        await ProductCategory.destroy({ where: { product_id: prod.id, category_id: catId } });
        await audit(req.user.id, "product.category.detach", "product", prod.id, { category_id: catId });
        res.json({ ok: true });
    } catch (e) { next(e); }
});
