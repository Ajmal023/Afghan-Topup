// src/routes/adminTopups.js
import { Router } from "express";
import IORedis from "ioredis";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { topupQueue } from "../services/orders/fulfillment.js"; // you already export this
import { Order, OrderItem, TopupLog, Operator } from "../models/index.js";

export const adminTopupsRouter = Router();

// must match your worker's lock helper
function lockKey(orderId, itemId) {
    return `topup:lock:${orderId}:${itemId}`;
}

// Reuse same Redis (new client is fine for reads)
const redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

/**
 * GET /api/admin/topups/pending
 * Optional filters:
 *   ?order_id=...   only jobs for a specific order
 *   ?item_id=...    only jobs for a specific order item
 *   ?limit=100      limit results (default 200)
 */
adminTopupsRouter.get("/pending", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { order_id: filterOrderId, item_id: filterItemId, limit = 200 } = req.query;
        // delayed = scheduled; waiting = queued; active = currently processing
        const jobs = await topupQueue.getJobs(
            ["delayed", "waiting", "active", "waiting-children"],
            0,
            Number(limit),
            true
        );

        const totalAllowed = 5;

        const rows = await Promise.all(
            jobs
                .filter((j) => {
                    if (!j?.data) return false;
                    if (filterOrderId && j.data.order_id !== filterOrderId) return false;
                    if (filterItemId && j.data.order_item_id !== filterItemId) return false;
                    return true;
                })
                .map(async (job) => {
                    const state = await job.getState(); // "delayed" | "waiting" | "active" | ...
                    const { order_id, order_item_id, try: nextTry = 1, intent_provider, intent_ref } = job.data || {};

                    const item = order_item_id ? await OrderItem.findByPk(order_item_id) : null;
                    const order = order_id ? await Order.findByPk(order_id) : null;
                    const lastLog = order_item_id
                        ? await TopupLog.findOne({
                            where: { order_item_id },
                            order: [["createdAt", "DESC"]],
                        })
                        : null;
                    const op = item?.operator_id ? await Operator.findByPk(item.operator_id) : null;

                    // remaining tries (including the scheduled one)
                    const tries_remaining_including_next = Math.max(0, totalAllowed - nextTry + 1);
                    // next run time for delayed jobs
                    const nextRunAt =
                        state === "delayed" && job.timestamp != null && job.delay != null
                            ? new Date(job.timestamp + job.delay)
                            : null;

                    // short lock presence (prevents duplicate concurrent sends for 30s in your worker)
                    const lockPresent = order_id && order_item_id
                        ? Boolean(await redis.get(lockKey(order_id, order_item_id)))
                        : false;

                    return {
                        job_id: job.id,
                        state,
                        next_run_at: nextRunAt,
                        order_id,
                        order_status: order?.status ?? null,
                        order_item_id,
                        msisdn: item?.msisdn ?? null,
                        operator: op ? { id: op.id, code: op.code, name: op.name } : null,
                        next_try: nextTry,
                        tries_total: totalAllowed,
                        tries_remaining_including_next,
                        payment_intent: intent_ref ? { provider: intent_provider, ref: intent_ref } : null,
                        last_log: lastLog
                            ? {
                                id: lastLog.id,
                                status: lastLog.status,
                                error_code: lastLog.error_code,
                                error_message: lastLog.error_message,
                                createdAt: lastLog.createdAt,
                            }
                            : null,
                    };
                })
        );

        res.json({ data: rows });
    } catch (e) {
        next(e);
    }
});

/**
 * (Optional) GET /api/admin/topups/pending/:jobId
 * Detailed view of a single job
 */
adminTopupsRouter.get("/pending/:jobId", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const job = await topupQueue.getJob(req.params.jobId);
        if (!job) return res.status(404).json({ error: "not found" });

        const state = await job.getState();
        const { order_id, order_item_id, try: nextTry = 1, intent_provider, intent_ref } = job.data || {};
        const item = order_item_id ? await OrderItem.findByPk(order_item_id) : null;
        const order = order_id ? await Order.findByPk(order_id) : null;
        const op = item?.operator_id ? await Operator.findByPk(item.operator_id) : null;

        const lastLog = order_item_id
            ? await TopupLog.findOne({ where: { order_item_id }, order: [["createdAt", "DESC"]] })
            : null;

        const totalAllowed = 5;
        const nextRunAt =
            state === "delayed" && job.timestamp != null && job.delay != null
                ? new Date(job.timestamp + job.delay)
                : null;

        res.json({
            data: {
                job_id: job.id,
                state,
                next_run_at: nextRunAt,
                order_id,
                order_status: order?.status ?? null,
                order_item_id,
                msisdn: item?.msisdn ?? null,
                operator: op ? { id: op.id, code: op.code, name: op.name } : null,
                next_try: nextTry,
                tries_total: totalAllowed,
                tries_remaining_including_next: Math.max(0, totalAllowed - nextTry + 1),
                payment_intent: intent_ref ? { provider: intent_provider, ref: intent_ref } : null,
                last_log: lastLog
                    ? {
                        id: lastLog.id,
                        status: lastLog.status,
                        error_code: lastLog.error_code,
                        error_message: lastLog.error_message,
                        createdAt: lastLog.createdAt,
                    }
                    : null,
                raw: {
                    data: job.data,
                    opts: job.opts,
                    timestamp: job.timestamp,
                    delay: job.delay,
                    attemptsMade: job.attemptsMade,
                },
            },
        });
    } catch (e) {
        next(e);
    }
});
