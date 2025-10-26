import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const ACCESS_TTL_SEC = 15 * 60;         // 15m
const REFRESH_TTL_SEC = 7 * 24 * 3600;  // 7d

export function newJti() {
    return crypto.randomUUID();
}
export function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccess(user) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL_SEC });
}
export function signRefresh(user, jti) {
    const payload = { sub: user.id, jti };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: REFRESH_TTL_SEC });
}

export function setAuthCookies(res, { access, refresh }) {
    const common = { httpOnly: true, sameSite: "lax", secure: false, path: "/" };
    res.cookie("access_token", access, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie("refresh_token", refresh, { ...common, maxAge: 7 * 24 * 3600 * 1000 });
}
export function clearAuthCookies(res) {
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
}
