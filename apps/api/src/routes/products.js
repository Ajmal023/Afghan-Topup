import { Router, json } from "express";
import { Op } from "sequelize";
import { Product, ProductVariant, ProductType, Category, ProductCategory, Operator } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";
import { productCategoriesRouter } from "./productCategories.js";

export const productsRouter = Router();


productsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { name, sku, product_type_id, description, is_active = true, operator_id = null } = req.body || {};
        if (!name || !product_type_id) return res.status(400).json({ error: "name and product_type_id required" });
        const row = await Product.create({ name, sku, product_type_id, description, is_active: !!is_active, operator_id });
        await audit(req.user.id, "product.create", "product", row.id, { name, sku, product_type_id });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

productsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, active, q, category, operator } = req.query;
        const where = {};
        if (active !== undefined) where.is_active = active === "true";
        if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { sku: { [Op.iLike]: `%${q}%` } }];
        if (type) where.product_type_id = type;
        if (operator) where.operator_id = operator;

        const include = [
            { model: ProductType, required: false },
            {
                model: ProductVariant,
                required: false,
                where: operator ? { operator_id: operator } : undefined
            },
            {
                model: Category,
                through: { attributes: [] },
                required: category ? true : false,
                where: category ? { id: category } : undefined
            }
        ];

        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await Product.findAndCountAll({
            where, include, offset, limit: Number(limit), order: [["createdAt", "DESC"]]
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});


productsRouter.get("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await Product.findByPk(req.params.id, {
            include: [
                { model: ProductVariant },
                { model: Category, through: { attributes: [] } },
                { model: ProductType }
            ]
        });
        if (!row) return res.status(404).json({ error: "not found" });
        res.json({ data: row });
    } catch (e) { next(e); }
});


productsRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await Product.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = { name: row.name, sku: row.sku, product_type_id: row.product_type_id, is_active: row.is_active, description: row.description, operator_id: row.operator_id };
        const { name, sku, product_type_id, is_active, description, operator_id } = req.body || {};
        if (name !== undefined) row.name = name;
        if (sku !== undefined) row.sku = sku;
        if (product_type_id !== undefined) row.product_type_id = product_type_id;
        if (is_active !== undefined) row.is_active = !!is_active;
        if (description !== undefined) row.description = description;
        if (operator_id !== undefined) row.operator_id = operator_id;
        await row.save();
        await audit(req.user.id, "product.update", "product", row.id, { before, after: { name: row.name, sku: row.sku, product_type_id: row.product_type_id, is_active: row.is_active, description: row.description } });
        res.json({ data: row });
    } catch (e) { next(e); }
});


productsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const variants = await ProductVariant.count({ where: { product_id: req.params.id } });
        if (variants > 0) return res.status(400).json({ error: "cannot delete product with variants" });
        const row = await Product.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        await row.destroy();
        await audit(req.user.id, "product.delete", "product", row.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

productsRouter.use("/:id/categories", productCategoriesRouter);