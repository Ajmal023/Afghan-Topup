import { getRedis } from "../services/redis.js";
export const rateLimitRedis = (keyPrefix, limit, windowSec) => async (req, res, next) => {
    try {
        const r = getRedis();
        const key = `${keyPrefix}:${req.ip}`;
        const n = await r.incr(key);
        if (n === 1) await r.expire(key, windowSec);
        if (n > limit) return res.status(429).json({ error: "Too many requests" });
        next();
    } catch (e) { next(e); }
};
