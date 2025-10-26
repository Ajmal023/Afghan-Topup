import { Router } from "express";
import { Op } from "sequelize";
import { Contact, Operator, User } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const contactsRouter = Router();

/** Simple MSISDN check (Afghanistan-style or generic) */
function validateMsisdn(msisdn) {
    if (!msisdn) return false;
    // allow "+93XXXXXXXXX" or "0XXXXXXXXX" or digits 9–15
    const re = /^(\+?\d{9,15})$/;
    return re.test(msisdn.trim());
}

/** Owner or Admin gate for a specific contact id */
async function guardOwnerOrAdmin(req, res, next) {
    try {
        const c = await Contact.findByPk(req.params.id);
        if (!c) return res.status(404).json({ error: "not found" });
        req.contact = c;
        if (req.user.role === "admin" || c.user_id === req.user.id) return next();
        return res.status(403).json({ error: "forbidden" });
    } catch (e) { next(e); }
}

/** POST /api/contacts  (customer/admin) */
contactsRouter.post("/", requireAuth, async (req, res, next) => {
    try {
        const { name, msisdn, operator_id = null, notes = null, user_id } = req.body || {};

        // Admin can create for someone else via user_id; customers create for themselves
        const ownerId = (req.user.role === "admin" && user_id) ? user_id : req.user.id;

        if (!name) return res.status(400).json({ error: "name required" });
        if (!validateMsisdn(msisdn)) return res.status(400).json({ error: "invalid msisdn" });
        if (operator_id) {
            const op = await Operator.findByPk(operator_id);
            if (!op) return res.status(400).json({ error: "operator not found" });
        }
        // Optional dedupe per user+msisdn
        const dup = await Contact.findOne({ where: { user_id: ownerId, msisdn } });
        if (dup) return res.status(409).json({ error: "contact already exists for this msisdn" });

        const row = await Contact.create({ user_id: ownerId, name, msisdn, operator_id, notes });
        await audit(req.user.id, "contact.create", "contact", row.id, { user_id: ownerId, msisdn });
        res.status(201).json({ data: row });
    } catch (e) { next(e); }
});

/** GET /api/contacts  (customer=own, admin=all or filter by userId) */
contactsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const { page = 1, limit = 20, q, userId } = req.query;
        const where = {};
        if (req.user.role === "admin") {
            if (userId) where.user_id = userId;
        } else {
            where.user_id = req.user.id;
        }
        if (q) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${q}%` } },
                { msisdn: { [Op.iLike]: `%${q}%` } }
            ];
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await Contact.findAndCountAll({
            where,
            include: [{ model: Operator, required: false }],
            order: [["createdAt", "DESC"]],
            offset,
            limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

/** PATCH /api/contacts/:id  (owner or admin) */
contactsRouter.patch("/:id", requireAuth, guardOwnerOrAdmin, async (req, res, next) => {
    try {
        const row = req.contact;
        const before = { name: row.name, msisdn: row.msisdn, operator_id: row.operator_id, notes: row.notes };
        const { name, msisdn, operator_id, notes } = req.body || {};

        if (msisdn !== undefined && !validateMsisdn(msisdn)) {
            return res.status(400).json({ error: "invalid msisdn" });
        }
        if (operator_id !== undefined && operator_id) {
            const op = await Operator.findByPk(operator_id);
            if (!op) return res.status(400).json({ error: "operator not found" });
            row.operator_id = operator_id;
        } else if (operator_id === null) {
            row.operator_id = null;
        }

        if (name !== undefined) row.name = name;
        if (msisdn !== undefined) row.msisdn = msisdn;
        if (notes !== undefined) row.notes = notes;

        await row.save();
        await audit(req.user.id, "contact.update", "contact", row.id, { before, after: { name: row.name, msisdn: row.msisdn, operator_id: row.operator_id, notes: row.notes } });
        res.json({ data: row });
    } catch (e) { next(e); }
});

contactsRouter.delete("/:id", requireAuth, guardOwnerOrAdmin, async (req, res, next) => {
    try {
        await req.contact.destroy();
        await audit(req.user.id, "contact.delete", "contact", req.params.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});
