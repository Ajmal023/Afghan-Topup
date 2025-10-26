import { Router } from "express";
import { Operator } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const operatorsRouter = Router();

operatorsRouter.get("/", requireAuth, requireRole("admin"), async (_req, res, next) => {
    try {
        const rows = await Operator.findAll({ order: [["name", "ASC"]] });
        res.json({ data: rows });
    } catch (e) { next(e); }
});

operatorsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { code, name, country = "AF" } = req.body || {};
        if (!code || !name) return res.status(400).json({ error: "code and name required" });
        const dup = await Operator.findOne({ where: { code } });
        if (dup) return res.status(409).json({ error: "code exists" });
        const row = await Operator.create({ code, name, country });
        await audit(req.user.id, "operator.create", "operator", row.id, { code, name });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

operatorsRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await Operator.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const before = { code: row.code, name: row.name, country: row.country };
        const { code, name, country } = req.body || {};
        if (code && code !== row.code) {
            const dup = await Operator.findOne({ where: { code } });
            if (dup) return res.status(409).json({ error: "code exists" });
            row.code = code;
        }
        if (name) row.name = name;
        if (country) row.country = country;
        await row.save();
        await audit(req.user.id, "operator.update", "operator", row.id, { before, after: { code: row.code, name: row.name, country: row.country } });
        res.json({ data: row });
    } catch (e) { next(e); }
});

operatorsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await Operator.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        await row.destroy();
        await audit(req.user.id, "operator.delete", "operator", row.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});
