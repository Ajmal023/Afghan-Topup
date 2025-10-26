import { Router } from "express";
import { Op, fn, col, literal } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { Order, PaymentIntent, TopupLog, Operator } from "../models/index.js";

export const adminDashRouter = Router();

function parseRange(req) {
    const { from, to, tz = "UTC" } = req.query;
    const now = new Date();
    const start = from ? new Date(from) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = to ? new Date(to) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { start, end, tz };
}


adminDashRouter.get("/overview", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { start, end } = parseRange(req);
        const whereRange = { createdAt: { [Op.between]: [start, end] } };

        const [ordersCreated, ordersPaid, revenue] = await Promise.all([
            Order.count({ where: { ...whereRange } }),
            Order.count({ where: { ...whereRange, status: { [Op.in]: ["paid", "fulfilled"] } } }),
            Order.sum("total_minor", { where: { ...whereRange, status: { [Op.in]: ["paid", "fulfilled"] } } })
        ]);


        const opAgg = await TopupLog.findAll({
            attributes: [
                "operator_id",
                [col("Operator.code"), "operator_code"],
                [col("Operator.name"), "operator_name"],
                [fn("SUM", literal(`CASE WHEN "TopupLog"."status" IN ('accepted','delivered') THEN 1 ELSE 0 END`)), "success"],
                [fn("SUM", literal(`CASE WHEN "TopupLog"."status" = 'failed' THEN 1 ELSE 0 END`)), "failed"],
                [fn("COUNT", literal("*")), "total"],
            ],
            where: whereRange,
            include: [{ model: Operator, attributes: [] }],
            group: [
                col("TopupLog.operator_id"),
                col("Operator.code"),
                col("Operator.name"),
            ],
            order: [[literal("success"), "DESC"]],
            limit: 5,
        });

        const topOperators = opAgg.map(r => ({
            operator_id: r.get("operator_id"),
            operator_code: r.get("operator_code"),
            operator_name: r.get("operator_name"),
            success: Number(r.get("success")),
            failed: Number(r.get("failed")),
            total: Number(r.get("total")),
        }));

        const successRate = ordersCreated > 0 ? +(ordersPaid / ordersCreated).toFixed(3) : 0;

        res.json({
            data: {
                range: { from: start.toISOString(), to: end.toISOString() },
                orders_created: ordersCreated,
                orders_paid_or_fulfilled: ordersPaid,
                revenue_minor: Number(revenue || 0),
                success_rate: successRate,
                top_operators: topOperators
            }
        });
    } catch (e) { next(e); }
});


adminDashRouter.get("/payments/summary", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { start, end } = parseRange(req);
        const { provider } = req.query;

        const where = { createdAt: { [Op.between]: [start, end] } };
        if (provider) where.provider = provider;

        const rows = await PaymentIntent.findAll({
            attributes: ["status", [fn("COUNT", literal("*")), "count"]],
            where,
            group: ["status"]
        });

        const counts = Object.fromEntries(rows.map(r => [r.status, Number(r.get("count"))]));
        const d = {
            created: counts.created || 0,
            pending: counts.pending || 0,
            succeeded: counts.succeeded || 0,
            failed: counts.failed || 0,
            cancelled: counts.cancelled || 0
        };
        const denom = d.created + d.pending;
        const conversion = denom > 0 ? +(d.succeeded / denom).toFixed(3) : 0;

        res.json({ data: { range: { from: start.toISOString(), to: end.toISOString() }, provider: provider || null, counts: d, conversion } });
    } catch (e) { next(e); }
});


adminDashRouter.get("/topups/summary", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { start, end } = parseRange(req);


        const latencyExpr = literal(`
  EXTRACT(EPOCH FROM ("TopupLog"."updatedAt" - "TopupLog"."createdAt"))*1000
`);

        const rows = await TopupLog.findAll({
            attributes: [
                "operator_id",
                [col("Operator.code"), "operator_code"],
                [col("Operator.name"), "operator_name"],
                [fn("SUM", literal(`CASE WHEN "TopupLog"."status" IN ('accepted','delivered') THEN 1 ELSE 0 END`)), "success"],
                [fn("SUM", literal(`CASE WHEN "TopupLog"."status" = 'failed' THEN 1 ELSE 0 END`)), "failed"],
                [fn("COUNT", literal("*")), "total"],
                [fn("AVG", latencyExpr), "avg_latency_ms"],
            ],
            where: { createdAt: { [Op.between]: [start, end] } },
            include: [{ model: Operator, attributes: [] }],
            group: [
                col("TopupLog.operator_id"),
                col("Operator.code"),
                col("Operator.name"),
            ],
            order: [[literal("success"), "DESC"]],
        });

        const data = rows.map(r => ({
            operator_id: r.get("operator_id"),
            operator_code: r.get("operator_code"),
            operator_name: r.get("operator_name"),
            success: Number(r.get("success")),
            failed: Number(r.get("failed")),
            total: Number(r.get("total")),
            avg_latency_ms: Math.round(Number(r.get("avg_latency_ms") || 0)),
        }));
        res.json({ data: { range: { from: start.toISOString(), to: end.toISOString() }, operators: data } });
    } catch (e) { next(e); }
});
