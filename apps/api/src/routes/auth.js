import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"
import { User, Session, OtpCode } from "../models/index.js";
import { audit } from "../services/audit.js";
import { rateLimitRedis } from "../middlewares/rateLimiter.js";
import { newJti, signAccess, signRefresh, setAuthCookies, clearAuthCookies, hashToken } from "../utils/tokens.js";
import { requireAuth } from "../middlewares/auth.js";
import { Op } from "sequelize";
import { sendOtpEmail } from "../services/mailer.js";

export const authRouter = Router();

function normalizePhone(s = "") {
    return s.replace(/\s+/g, "");
}
function isEmail(s = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isPhone(s = "") {
    return /^\+?\d{7,15}$/.test(normalizePhone(s));
}
function genOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function issueOtp({ user, channel, destination, purpose }) {
    const code = genOtp();
    const code_hash = await bcrypt.hash(code, 10);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await OtpCode.create({
        user_id: user?.id ?? null,
        channel,
        destination,
        purpose,
        code_hash,
        expires_at,
        attempts: 0,
        consumed: false,
    });
    if (channel === "email") {
        try {
            await sendOtpEmail({ to: destination, code, purpose });
        } catch (err) {
            console.error("sendOtpEmail failed:", err);
        }
    }
    await audit(user?.id ?? null, `auth.otp.${purpose}.send`, "otp_code", null, null, { channel, destination });
    return code; 
}


authRouter.post("/signup", rateLimitRedis("signup", 30, 3600), async (req, res, next) => {
    try {
        const { email, phone } = req.body || {};
        if (!email && !phone) return res.status(400).json({ error: "email or phone required" });

        const normEmail = email?.toLowerCase().trim() || null;
        const normPhone = phone ? normalizePhone(phone) : null;

        if (normEmail && !isEmail(normEmail)) return res.status(400).json({ error: "invalid email" });
        if (normPhone && !isPhone(normPhone)) return res.status(400).json({ error: "invalid phone" });

        if (normEmail) {
            const dup = await User.findOne({ where: { email: normEmail } });
            if (dup) return res.status(409).json({ error: "email already exists" });
        }
        if (normPhone) {
            const dup = await User.findOne({ where: { phone: normPhone } });
            if (dup) return res.status(409).json({ error: "phone already exists" });
        }

        const user = await User.create({
            email: normEmail,
            phone: normPhone,
            role: "customer",
            is_email_verified: false,
            is_phone_verified: false,
        });

        await audit(user.id, "auth.signup", "user", user.id);

       
        const otps = {};
        if (normEmail) otps.email = await issueOtp({ user, channel: "email", destination: normEmail, purpose: "login" });
        if (normPhone) otps.phone = await issueOtp({ user, channel: "phone", destination: normPhone, purpose: "login" });

        return res.status(201).json({
            data: { id: user.id, email: user.email, phone: user.phone, role: user.role },
        });
    } catch (e) { next(e); }
});

authRouter.post("/login", rateLimitRedis("login", 50, 900), async (req, res, next) => {
    try {
        const { email, phone, identifier, password } = req.body || {};


        let where = {};
        if (identifier) {
            if (isEmail(identifier)) where.email = identifier.toLowerCase().trim();
            else if (isPhone(identifier)) where.phone = normalizePhone(identifier);
            else return res.status(400).json({ error: "invalid identifier" });
        } else if (email) {
            where.email = String(email).toLowerCase().trim();
        } else if (phone) {
            where.phone = normalizePhone(phone);
        } else {
            return res.status(400).json({ error: "email/phone/identifier required" });
        }

        const user = await User.findOne({ where });
        if (!user) return res.status(404).json({ error: "user not found" });

        // OTP mode (no password in request)
        if (!password) {
            const channel = where.email ? "email" : "phone";
            const destination = where.email ? user.email : user.phone;
            if (!destination) return res.status(400).json({ error: `no ${channel} on account` });

            const code = await issueOtp({ user, channel, destination, purpose: "login" });
            return res.json({
                sent: true,
                channel,
                destination,
                purpose: "login"
            });
        }

        // Password login (legacy)
        if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
            await audit(null, "auth.login.failure", "user", null, null, { ip: req.ip, ua: req.headers["user-agent"], where });
            return res.status(401).json({ error: "invalid credentials" });
        }

        const jti = newJti();
        const access = signAccess(user);
        const refresh = signRefresh(user, jti);
        await Session.create({
            user_id: user.id,
            jti,
            refresh_token_hash: hashToken(refresh),
            revoked: false,
            ip: req.ip,
            user_agent: req.headers["user-agent"],
            expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        });
        setAuthCookies(res, { access, refresh });
        await audit(user.id, "auth.login.success", "user", user.id, null, { ip: req.ip });
        return res.json({ ok: true });
    } catch (e) { next(e); }
});

/** OTP: request code (login / reset_password / verify_contact) */
authRouter.post("/otp/request", rateLimitRedis("otp_req", 10, 300), async (req, res, next) => {
    try {
        const { email, phone, purpose } = req.body || {};
        if (!["login", "reset_password", "verify_contact"].includes(String(purpose))) {
            return res.status(400).json({ error: "invalid purpose" });
        }
        let channel = null, destination = null;

        if (email) {
            if (!isEmail(email)) return res.status(400).json({ error: "invalid email" });
            channel = "email"; destination = email.toLowerCase().trim();
        } else if (phone) {
            if (!isPhone(phone)) return res.status(400).json({ error: "invalid phone" });
            channel = "phone"; destination = normalizePhone(phone);
        } else {
            return res.status(400).json({ error: "email or phone required" });
        }

        // find existing user (optional for verify_contact; required for login/reset)
        let user = await User.findOne({
            where: channel === "email" ? { email: destination } : { phone: destination }
        });

        if ((purpose === "login" || purpose === "reset_password") && !user) {
            return res.status(404).json({ error: "user not found" });
        }

        await issueOtp({ user, channel, destination, purpose });

        // TODO: send the code via email/SMS. For now, return in response for testing.
        res.json({ sent: true, channel, destination, purpose });
    } catch (e) { next(e); }
});

/** OTP: verify (login) → issues cookies; (reset_password) → returns token for reset; (verify_contact) → marks verified */
authRouter.post("/otp/verify", rateLimitRedis("otp_verify", 30, 600), async (req, res, next) => {
    try {
        const { email, phone, purpose, code, new_password } = req.body || {};
        if (!code) return res.status(400).json({ error: "code required" });

        let channel = null, destination = null;
        if (email) { if (!isEmail(email)) return res.status(400).json({ error: "invalid email" }); channel = "email"; destination = email.toLowerCase().trim(); }
        else if (phone) { if (!isPhone(phone)) return res.status(400).json({ error: "invalid phone" }); channel = "phone"; destination = normalizePhone(phone); }
        else return res.status(400).json({ error: "email or phone required" });

        const row = await OtpCode.findOne({
            where: {
                channel, destination, purpose,
                consumed: false,
                expires_at: { [Op.gt]: new Date() },
            },
            order: [["createdAt", "DESC"]],
        });
        if (!row) return res.status(400).json({ error: "no active code" });

        // rate-limit attempts on this record
        if (row.attempts >= 8) {
            row.consumed = true; await row.save();
            return res.status(429).json({ error: "too many attempts" });
        }

        const ok = await bcrypt.compare(String(code), row.code_hash);
        row.attempts += 1;
        if (!ok) { await row.save(); return res.status(401).json({ error: "invalid code" }); }

        // success
        row.consumed = true;
        await row.save();

        // find or re-check user
        let user = row.user_id ? await User.findByPk(row.user_id) : null;
        if (!user) {
            user = await User.findOne({ where: channel === "email" ? { email: destination } : { phone: destination } });
            if (!user && purpose !== "verify_contact") {
                return res.status(404).json({ error: "user not found" });
            }
        }

        if (purpose === "login") {
            // login → issue session + cookies
            const jti = newJti();
            const access = signAccess(user);
            const refresh = signRefresh(user, jti);
            await Session.create({
                user_id: user.id,
                jti,
                refresh_token_hash: hashToken(refresh),
                revoked: false,
                ip: req.ip,
                user_agent: req.headers["user-agent"],
                expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
            });
            setAuthCookies(res, { access, refresh });

            // mark contact verified
            if (channel === "email" && user.email === destination) user.is_email_verified = true;
            if (channel === "phone" && user.phone === destination) user.is_phone_verified = true;
            await user.save();

            await audit(user.id, "auth.login.otp", "user", user.id, null, { channel });
            return res.json({ ok: true });
        }

        if (purpose === "reset_password") {
            if (!new_password) {
                // Return a short-lived reset token (or you can require new_password here)
                const payload = { sub: user.id, typ: "pwreset" };
                const resetToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
                return res.json({ ok: true, reset_token: resetToken });
            } else {
                // directly set password when code verified with new_password present
                user.password_hash = await bcrypt.hash(String(new_password), 12);
                await user.save();
                await audit(user.id, "auth.password.reset", "user", user.id, null, { channel });
                return res.json({ ok: true });
            }
        }

        if (purpose === "verify_contact") {
            if (channel === "email") user.is_email_verified = true;
            if (channel === "phone") user.is_phone_verified = true;
            await user.save();
            await audit(user.id, "auth.verify_contact", "user", user.id, null, { channel });
            return res.json({ ok: true });
        }

        return res.json({ ok: true });
    } catch (e) { next(e); }
});

/** Complete password reset using reset_token from /otp/verify */
authRouter.post("/password/reset", rateLimitRedis("pwreset", 30, 900), async (req, res, next) => {
    try {
        const { reset_token, new_password } = req.body || {};
        if (!reset_token || !new_password) return res.status(400).json({ error: "reset_token and new_password required" });
        let payload;
        try { payload = jwt.verify(reset_token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: "invalid or expired reset token" }); }

        if (payload.typ !== "pwreset") return res.status(400).json({ error: "invalid token type" });
        const user = await User.findByPk(payload.sub);
        if (!user) return res.status(404).json({ error: "user not found" });

        user.password_hash = await bcrypt.hash(String(new_password), 12);
        await user.save();
        await audit(user.id, "auth.password.reset.finalize", "user", user.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

/** Logout */
authRouter.post("/logout", async (req, res, next) => {
    try {
        const refresh = req.cookies?.refresh_token;
        if (refresh) {
            try {
                const { jti, sub } = jwt.verify(refresh, process.env.JWT_SECRET);
                await Session.update({ revoked: true }, { where: { jti, user_id: sub } });
                await audit(sub, "auth.logout", "session", jti);
            } catch { /* ignore */ }
        }
        clearAuthCookies(res);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

/** Refresh (rotate) */
authRouter.post("/refresh", async (req, res, next) => {
    try {
        const token = req.cookies?.refresh_token;
        if (!token) return res.status(401).json({ error: "missing refresh token" });
        let payload;
        try { payload = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: "invalid refresh token" }); }

        const sess = await Session.findOne({ where: { jti: payload.jti, user_id: payload.sub, revoked: false } });
        if (!sess) return res.status(401).json({ error: "session revoked" });
        if (sess.refresh_token_hash !== hashToken(token)) return res.status(401).json({ error: "token mismatch" });

        // rotate
        const user = await User.findByPk(payload.sub);
        const newJ = newJti();
        const access = signAccess(user);
        const refresh = signRefresh(user, newJ);

        await Session.update({ revoked: true }, { where: { id: sess.id } });
        await Session.create({
            user_id: user.id,
            jti: newJ,
            refresh_token_hash: hashToken(refresh),
            revoked: false,
            ip: req.ip,
            user_agent: req.headers["user-agent"],
            expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        });

        setAuthCookies(res, { access, refresh });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

/** Me (light) */
authRouter.get("/me", requireAuth, async (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        is_email_verified: req.user.is_email_verified,
        is_phone_verified: req.user.is_phone_verified,
        createdAt: req.user.createdAt,
    });
});

/** Profile update (email/phone) */
authRouter.patch("/me", requireAuth, async (req, res, next) => {
    try {
        const { email, phone } = req.body || {};
        if (!email && !phone) return res.status(400).json({ error: "nothing to update" });

        if (email !== undefined) {
            const e = email?.toLowerCase().trim() || null;
            if (e && !isEmail(e)) return res.status(400).json({ error: "invalid email" });
            if (e && e !== req.user.email) {
                const dup = await User.findOne({ where: { email: e } });
                if (dup) return res.status(409).json({ error: "email already in use" });
                req.user.email = e;
                req.user.is_email_verified = false;
            } else if (!e) {
                req.user.email = null;
                req.user.is_email_verified = false;
            }
        }

        if (phone !== undefined) {
            const p = phone ? normalizePhone(phone) : null;
            if (p && !isPhone(p)) return res.status(400).json({ error: "invalid phone" });
            if (p && p !== req.user.phone) {
                const dup = await User.findOne({ where: { phone: p } });
                if (dup) return res.status(409).json({ error: "phone already in use" });
                req.user.phone = p;
                req.user.is_phone_verified = false;
            } else if (!p) {
                req.user.phone = null;
                req.user.is_phone_verified = false;
            }
        }

        await req.user.save();
        await audit(req.user.id, "profile.update", "user", req.user.id, null, { email: req.user.email, phone: req.user.phone });
        res.json({ ok: true, data: { email: req.user.email, phone: req.user.phone, is_email_verified: req.user.is_email_verified, is_phone_verified: req.user.is_phone_verified } });
    } catch (e) { next(e); }
});

/** Change password (authenticated) */
authRouter.patch("/me/password", requireAuth, async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body || {};
        if (!current_password || !new_password) return res.status(400).json({ error: "current_password & new_password required" });
        if (!req.user.password_hash || !(await bcrypt.compare(current_password, req.user.password_hash))) {
            return res.status(401).json({ error: "invalid current password" });
        }
        req.user.password_hash = await bcrypt.hash(String(new_password), 12);
        await req.user.save();
        await audit(req.user.id, "profile.password.change", "user", req.user.id);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

/** (Optional) SSO stubs */
authRouter.get("/sso/:provider/start", (req, res) => {
    // TODO: Implement provider redirect (google, apple, etc.)
    res.status(501).json({ error: "SSO not implemented yet" });
});
authRouter.get("/sso/:provider/callback", (req, res) => {
    // TODO: Exchange code -> profile -> create/login user -> set cookies
    res.status(501).json({ error: "SSO not implemented yet" });
});
