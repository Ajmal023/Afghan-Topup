// Uses Redis to store a response by idempotency key for ~15m
import { getRedis } from "../services/redis.js";

export async function useIdempotency(req, res, next) {
    const key = req.header("Idempotency-Key");
    if (!key) return next();
    const r = getRedis();
    const cacheKey = `idem:${key}`;
    const hit = await r.get(cacheKey);
    if (hit) {
        const parsed = JSON.parse(hit);
        return res.status(parsed.status).json(parsed.body);
    }
    // Monkey-patch res.json to cache the first response
    const orig = res.json.bind(res);
    res.json = async (body) => {
        try {
            await r.setex(cacheKey, 15 * 60, JSON.stringify({ status: res.statusCode || 200, body }));
        } catch { }
        return orig(body);
    };
    next();
}
