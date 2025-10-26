import { Router } from "express";
import { Session } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const sessionsRouter = Router();

/** List sessions (admin) or by self with ?me=true */
sessionsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const { userId, me } = req.query;
        const where = {};
        if (me === "true") where.user_id = req.user.id;
        else {
            if (!userId) return requireRole("admin")(req, res, () => { });
            where.user_id = userId;
        }
        const rows = await Session.findAll({ where, order: [["createdAt", "DESC"]] });
        res.json({ data: rows });
    } catch (e) { next(e); }
});

/** Revoke one session (admin or self) */
sessionsRouter.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const sess = await Session.findByPk(req.params.id);
        if (!sess) return res.status(404).json({ error: "Not found" });
        if (sess.user_id !== req.user.id) {
            return requireRole("admin")(req, res, async () => {
                await sess.update({ revoked: true });
                res.json({ ok: true });
            });
        }
        await sess.update({ revoked: true });
        res.json({ ok: true });
    } catch (e) { next(e); }
});
