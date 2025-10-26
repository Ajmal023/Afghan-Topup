import { Router } from "express";
import { ProductType } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const productTypesRouter = Router();

// List
productTypesRouter.get("/", requireAuth, requireRole("admin"), async (_req, res, next) => {
    try {
        const rows = await ProductType.findAll({ order: [["createdAt", "DESC"]] });
        res.json({ data: rows });
    } catch (e) { next(e); }
});

// Create
productTypesRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { code, name, description } = req.body || {};
        if (!code || !name) return res.status(400).json({ error: "code and name required" });
        const exists = await ProductType.findOne({ where: { code } });
        if (exists) return res.status(409).json({ error: "code already exists" });
        const row = await ProductType.create({ code, name, description });
        await audit(req.user.id, "product_type.create", "product_type", row.id, { code, name });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

// Update
productTypesRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await ProductType.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = { code: row.code, name: row.name, description: row.description };
        const { code, name, description } = req.body || {};
        if (code && code !== row.code) {
            const dup = await ProductType.findOne({ where: { code } });
            if (dup) return res.status(409).json({ error: "code already exists" });
            row.code = code;
        }
        if (name) row.name = name;
        if (description !== undefined) row.description = description;
        await row.save();
        await audit(req.user.id, "product_type.update", "product_type", row.id, { before, after: { code: row.code, name: row.name, description: row.description } });
        res.json({ data: row });
    } catch (e) { next(e); }
});

// Delete (hard)
productTypesRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const count = await Product.count({ where: { product_type_id: req.params.id } });
        if (count > 0) {
            return res.status(400).json({ error: "cannot delete product type in use by products" });
        }
        const row = await ProductType.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        await row.destroy();
        await audit(req.user.id, "product_type.delete", "product_type", req.params.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});