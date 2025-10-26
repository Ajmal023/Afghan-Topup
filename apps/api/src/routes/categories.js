import { Router } from "express";
import { Category, ProductCategory } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", requireAuth, requireRole("admin"), async (_req, res, next) => {
    try {
        const rows = await Category.findAll({
            order: [["createdAt", "DESC"]]
        });
        // Shape with parent name on the fly (cheap and UI-friendly)
        const byId = Object.fromEntries(rows.map(r => [r.id, r]));
        res.json({
            data: rows.map(r => ({
                ...r.toJSON(),
                parent_name: r.parent_id ? byId[r.parent_id]?.name ?? null : null,
            }))
        });
    } catch (e) { next(e); }
});

categoriesRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { name, slug, parent_id } = req.body || {};
        if (!name) return res.status(400).json({ error: "name required" });
        if (slug) {
            const dup = await Category.findOne({ where: { slug } });
            if (dup) return res.status(409).json({ error: "slug already exists" });
        }
        if (parent_id) {
            const parent = await Category.findByPk(parent_id);
            if (!parent) return res.status(400).json({ error: "parent not found" });
        }
        const row = await Category.create({ name, slug, parent_id: parent_id || null });
        await audit(req.user.id, "category.create", "category", row.id, { name, slug, parent_id });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

// prevent cycles
async function checkNoCycle(categoryId, newParentId) {
    if (!newParentId) return true;
    if (categoryId === newParentId) return false;
    let cur = await Category.findByPk(newParentId);
    while (cur) {
        if (cur.id === categoryId) return false;
        cur = cur.parent_id ? await Category.findByPk(cur.parent_id) : null;
    }
    return true;
}

categoriesRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await Category.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = { name: row.name, slug: row.slug, parent_id: row.parent_id };
        const { name, slug, parent_id } = req.body || {};
        if (slug && slug !== row.slug) {
            const dup = await Category.findOne({ where: { slug } });
            if (dup) return res.status(409).json({ error: "slug already exists" });
        }
        if (parent_id !== undefined) {
            const ok = await checkNoCycle(row.id, parent_id);
            if (!ok) return res.status(400).json({ error: "cyclic parent not allowed" });
            if (parent_id) {
                const parent = await Category.findByPk(parent_id);
                if (!parent) return res.status(400).json({ error: "parent not found" });
            }
            row.parent_id = parent_id || null;
        }
        if (name) row.name = name;
        if (slug) row.slug = slug;
        await row.save();
        await audit(req.user.id, "category.update", "category", row.id, { before, after: { name: row.name, slug: row.slug, parent_id: row.parent_id } });
        res.json({ data: row });
    } catch (e) { next(e); }
});

categoriesRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const id = req.params.id;
        const row = await Category.findByPk(id);
        if (!row) return res.status(404).json({ error: "not found" });

        const children = await Category.count({ where: { parent_id: id } });
        if (children > 0) return res.status(400).json({ error: "cannot delete category with children" });

        const attached = await ProductCategory.count({ where: { category_id: id } });
        if (attached > 0) return res.status(400).json({ error: "cannot delete category attached to products" });

        await row.destroy();
        await audit(req.user.id, "category.delete", "category", row.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});
