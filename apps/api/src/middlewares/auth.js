import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthenticated" });
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
        next();
    } catch { return res.status(401).json({ error: "Invalid/expired token" }); }
}
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
};
