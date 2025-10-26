// src/middlewares/optionalAuth.js
import jwt from "jsonwebtoken";

export function optionalAuth(req, _res, next) {
    // If already authenticated (e.g. requireAuth before), keep it.
    if (req.user) return next();

    const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null;

    const token = req.cookies?.access_token || bearer;
    if (!token) return next();

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            clockTolerance: 5, // seconds (optional)
        });
        // Only set what you need downstream
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
        // ignore invalid/expired tokens
    }
    next();
}
