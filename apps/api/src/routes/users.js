import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { audit } from "../services/audit.js";

export const usersRouter = Router();


usersRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, role, email } = req.query;
        const where = {};
        if (role) where.role = role;
        if (email) where.email = email;
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await User.findAndCountAll({
            where, offset, limit: Number(limit), order: [["createdAt", "DESC"]]
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});


usersRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { email, phone, role = "sales", password } = req.body || {};
        if (!email) return res.status(400).json({ error: "email required" });
        const exists = await User.findOne({ where: { email } });
        if (exists) return res.status(409).json({ error: "Email exists" });
        const password_hash = password ? await bcrypt.hash(password, 12) : null;
        const u = await User.create({ email, phone, role, password_hash, is_email_verified: !!password_hash });
        await audit(req.user.id, "user.create", "user", u.id, { email, role });
        res.status(201).json({ id: u.id, email: u.email, role: u.role });
    } catch (e) { next(e); }
});


usersRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const u = await User.findByPk(req.params.id);
        if (!u) return res.status(404).json({ error: "Not found" });
        const before = { role: u.role, is_email_verified: u.is_email_verified, is_phone_verified: u.is_phone_verified };
        const { role, is_email_verified, is_phone_verified, password } = req.body || {};
        if (role) u.role = role;
        if (typeof is_email_verified === "boolean") u.is_email_verified = is_email_verified;
        if (typeof is_phone_verified === "boolean") u.is_phone_verified = is_phone_verified;
        if (password) u.password_hash = await bcrypt.hash(password, 12);
        await u.save();
        await audit(req.user.id, "user.update", "user", u.id, { before, after: { role: u.role, is_email_verified: u.is_email_verified, is_phone_verified: u.is_phone_verified } });
        res.json({ id: u.id, email: u.email, role: u.role });
    } catch (e) { next(e); }
});


usersRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const u = await User.findByPk(req.params.id);
        if (!u) return res.status(404).json({ error: "Not found" });
        await u.destroy();
        await audit(req.user.id, "user.delete", "user", req.params.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});
