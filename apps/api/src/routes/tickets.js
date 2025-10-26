import { Router } from "express";
import { Op } from "sequelize";
import { Ticket, TicketComment, User } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import { audit } from "../services/audit.js";

export const ticketsRouter = Router();

/** POST /api/tickets  (guest or customer) */
ticketsRouter.post("/", optionalAuth, async (req, res, next) => {
    try {
        const { subject, body, email, phone, priority = "normal" } = req.body || {};
        if (!subject || !body) return res.status(400).json({ error: "subject and body required" });

        const t = await Ticket.create({
            user_id: req.user?.id || null,
            subject,
            status: "open",
            priority: ["low", "normal", "high"].includes(priority) ? priority : "normal",
            assignee_user_id: null,
        });

        await TicketComment.create({
            ticket_id: t.id,
            author_user_id: req.user?.id || null,
            body,
            internal: false
        });

        await audit(req.user?.id || null, "ticket.create", "ticket", t.id, { subject });
        res.status(201).json({ data: t });
    } catch (e) { next(e); }
});

/** GET /api/tickets  (admin: all with filters; customer: own only) */
ticketsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, priority, user, q, from, to } = req.query;
        const where = {};
        if (req.user.role !== "admin") {
            // customers only see their own tickets
            where.customer_user_id = req.user.id
        } else {
            if (user) where.user_id = user;
        }
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (q) where.subject = { [Op.iLike]: `%${q}%` };
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }

        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await Ticket.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
            offset,
            limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

/** GET /api/tickets/:id  (RBAC: admin or owner) */
ticketsRouter.get("/:id", requireAuth, async (req, res, next) => {
    try {
        const t = await Ticket.findByPk(req.params.id);
        if (!t) return res.status(404).json({ error: "not found" });
        if (req.user.role !== "admin" && t.customer_user_id !== req.user.id) {
            return res.status(403).json({ error: "forbidden" });
        }
        res.json({ data: t });
    } catch (e) { next(e); }
});

/** PATCH /api/tickets/:id  (admin only: status/assignee/priority) */
ticketsRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const t = await Ticket.findByPk(req.params.id);
        if (!t) return res.status(404).json({ error: "not found" });
        const before = t.toJSON();

        const { status, assignee_user_id, priority } = req.body || {};
        if (status) {
            const allowed = ["open", "pending", "closed"];
            if (!allowed.includes(status)) return res.status(400).json({ error: "invalid status" });
            t.status = status;
        }
        if (priority) {
            const allowedP = ["low", "normal", "high"];
            if (!allowedP.includes(priority)) return res.status(400).json({ error: "invalid priority" });
            t.priority = priority;
        }
        if (assignee_user_id !== undefined) {
            t.assignee_user_id = assignee_user_id || null;
        }

        await t.save();
        await audit(req.user.id, "ticket.update", "ticket", t.id, { before, after: t.toJSON() });
        res.json({ data: t });
    } catch (e) { next(e); }
});

/** POST /api/tickets/:id/comments  (admin/customer; internal allowed for staff) */
ticketsRouter.post("/:id/comments", requireAuth, async (req, res, next) => {
    try {
        const t = await Ticket.findByPk(req.params.id);
        if (!t) return res.status(404).json({ error: "not found" });

        const { body, internal = false } = req.body || {};
        if (!body) return res.status(400).json({ error: "body required" });

        // Only staff can post internal notes
        if (internal && req.user.role !== "admin" && req.user.role !== "sales") {
            return res.status(403).json({ error: "only staff can post internal comments" });
        }

        // Customers may comment only on their own ticket
        if (req.user.role !== "admin" && req.user.role !== "sales") {
            if (t.user_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
        }

        const c = await TicketComment.create({
            ticket_id: t.id,
            author_user_id: req.user.id,
            body,
            internal: !!internal
        });

        await audit(req.user.id, "ticket.comment.create", "ticket", t.id, { internal: !!internal });
        res.status(201).json({ data: c });
    } catch (e) { next(e); }
});

/** GET /api/tickets/:id/comments  (hide internal to customers) */
ticketsRouter.get("/:id/comments", requireAuth, async (req, res, next) => {
    try {
        const t = await Ticket.findByPk(req.params.id);
        if (!t) return res.status(404).json({ error: "not found" });

        if (req.user.role !== "admin" && req.user.role !== "sales" && t.user_id !== req.user.id) {
            return res.status(403).json({ error: "forbidden" });
        }

        const where = { ticket_id: t.id };
        if (req.user.role !== "admin" && req.user.role !== "sales") {
            // customer: exclude internal notes
            where.internal = false;
        }

        const rows = await TicketComment.findAll({
            where,
            order: [["createdAt", "ASC"]]
        });

        res.json({ data: rows });
    } catch (e) { next(e); }
});
