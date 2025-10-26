// apps/api/src/services/redis.js
import Redis from "ioredis";

let redis;

export const initRedis = async () => {
    redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,   // 👈 important for BullMQ
        enableReadyCheck: false,      // optional
    });
    redis.on("connect", () => console.log("✅ Redis connected"));
    redis.on("error", (e) => console.error("Redis error:", e));
    return redis;
};

export const getRedis = () => redis;
