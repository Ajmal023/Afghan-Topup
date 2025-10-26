import { Router } from "express";
import { Op } from "sequelize";
import { Order, OrderItem, User, PromoUse, PaymentIntent, ProductVariant, TopupLog, Operator } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { useIdempotency } from "../services/idempotency.js";
import { priceItems } from "../services/orders/pricing.js";
import { applyPromo } from "../services/orders/promos.js";
import { audit } from "../services/audit.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";

export const ordersRouter = Router();

function maskMsisdn(s) {
    if (!s) return null;
    const d = s.replace(/\D/g, "");
    if (d.length <= 4) return d;
    return d;
}
function currencyDecimals(code) { return { USD: 2, AFN: 2 }[code.toUpperCase()] ?? 2; }
function toMajor(minor, code) {
    const dec = currencyDecimals(code);
    const v = Number(minor || 0) / Math.pow(10, dec);
    return v; // return number; UI can format
}
function pickTopupStatus(logs = []) {
    if (!logs.length) return "none";
    return logs[0]?.status ?? "unknown"; // logs sorted desc
}
function buildTimeline(order, payments = [], itemLogs = []) {
    const t = [];
    t.push({ at: order.createdAt, type: "order.created", label: "Order created" });
    const pi = payments[0];
    if (pi) {
        t.push({ at: pi.createdAt, type: `payment.${pi.status}`, label: `Payment ${pi.status}` });
    }
    const firstLog = itemLogs[0];
    if (firstLog) {
        t.push({ at: firstLog.createdAt, type: `topup.${firstLog.status}`, label: `Top-up ${firstLog.status}` });
    }
    if (order.status === "fulfilled") {
        t.push({ at: order.updatedAt, type: "order.fulfilled", label: "Order fulfilled" });
    } else if (order.status === "paid") {
        t.push({ at: order.updatedAt, type: "order.paid", label: "Order paid" });
    } else if (order.status === "cancelled") {
        t.push({ at: order.updatedAt, type: "order.cancelled", label: "Order cancelled" });
    }
    // newest first for UI
    return t.sort((a, b) => new Date(b.at) - new Date(a.at));
}


// Create (guest or user)
ordersRouter.post("/", optionalAuth, useIdempotency, async (req, res, next) => {
    try {
        const userId = req.cookies?.access_token ? req.user?.id : null; // if you want guest allowed with no auth
        const { items, email, phone, promo_code } = req.body || {};
        const priced = await priceItems(items);

        // Promo (optional)
        let discount_minor = 0;
        let promo = null;
        if (promo_code) {
            const result = await applyPromo({ code: promo_code, userId, orderTotalMinor: priced.total_minor });
            discount_minor = result.discount_minor;
            promo = result.promo;
        }

        const grand = Math.max(0, priced.total_minor - discount_minor);
        const order = await Order.create({
            user_id: userId,
            status: "created",
            total_minor: priced.total_minor,
            currency: "AFN",
            email: userId ? null : email,
            phone: userId ? null : phone
        });

        // Items
        for (const it of priced.items) {
            const { order_id: _ignore, ...rest } = it;
            await OrderItem.create({ ...rest, order_id: order.id });
        }

        // Promo use record
        if (promo) {
            await PromoUse.create({
                promo_code_id: promo.id,
                user_id: userId,
                order_id: order.id,
                amount_discount_minor: discount_minor,
                currency: "AFN"
            });
        }

        await audit(userId, "order.create", "order", order.id, { itemsCount: priced.items.length, total: priced.total_minor, discount_minor, grand });
        res.status(201).json({ data: { ...order.toJSON(), items: priced.items, discount_minor } });
    } catch (e) { next(e); }
});

// List (admin all + filters; user own)
ordersRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, user, from, to } = req.query;
        const where = {};
        if (req.user.role !== "admin") where.user_id = req.user.id;
        if (status) where.status = status;
        if (user && req.user.role === "admin") where.user_id = user;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await Order.findAndCountAll({
            where, order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });
        res.json({ data: rows, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

// ADD: `?full=1` to include payments+topups+operator+variant and return a friendlier DTO
ordersRouter.get("/:id", requireAuth, async (req, res, next) => {
    try {
        const full = req.query.full === "1" || req.query.full === "true";
        const include = [
            {
                model: OrderItem,
                include: full ? [
                    { model: ProductVariant, attributes: ["id", "name", "code"] },
                    { model: Operator, attributes: ["id", "code", "name"] },
                    {
                        model: TopupLog,
                        separate: true, // fastest for hasMany lists
                        limit: 10,
                        order: [["createdAt", "DESC"]],
                        attributes: [
                            "id", "status", "provider", "operator_id", "msisdn",
                            "provider_txn_id", "error_code", "error_message",
                            "createdAt"
                        ]
                    }
                ] : []
            }
        ];
        if (full) {
            include.push({
                model: PaymentIntent,
                separate: true,
                limit: 10,
                order: [["createdAt", "DESC"]],
                attributes: [
                    "id", "provider", "amount_minor", "currency", "status",
                    "provider_ref", "error_message", "createdAt"
                ]
            });
            include.push({ model: User, attributes: ["id", "email"] });
        }

        const row = await Order.findByPk(req.params.id, { include });
        if (!row) return res.status(404).json({ error: "not found" });
        if (req.user.role !== "admin" && row.user_id !== req.user.id) {
            return res.status(403).json({ error: "forbidden" });
        }

        if (!full) {
            // old minimal response
            return res.json({ data: row });
        }

        // Build a readable DTO for the UI
        const payments = (row.PaymentIntents || []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)).map(p => ({
            id: p.id,
            provider: p.provider,
            amount_minor: Number(p.amount_minor),
            amount_major: toMajor(p.amount_minor, p.currency),
            currency: p.currency,
            status: p.status,
            provider_ref: p.provider_ref,
            error_message: p.error_message || null,
            createdAt: p.createdAt,
        }));

        const items = (row.OrderItems || []).map(it => ({
            id: it.id,
            quantity: it.quantity,
            currency: it.currency,
            unit_price_minor: Number(it.unit_price_minor),
            unit_price_major: toMajor(it.unit_price_minor, it.currency),
            display_usd_minor: it.display_usd_minor == null ? null : Number(it.display_usd_minor),
            display_usd_major: it.display_usd_minor == null ? null : toMajor(it.display_usd_minor, "USD"),
            fx_rate_to_usd_snapshot: it.fx_rate_to_usd_snapshot,
            msisdn_masked: maskMsisdn(it.msisdn),
            operator: it.Operator ? { id: it.Operator.id, code: it.Operator.code, name: it.Operator.name } : null,
            variant: it.ProductVariant ? { id: it.ProductVariant.id, name: it.ProductVariant.name, code: it.ProductVariant.code || null } : null,
            topup_logs: (it.TopupLogs || []).map(l => ({
                id: l.id,
                status: l.status,
                provider: l.provider,
                operator_id: l.operator_id,
                operator: l.Operator ? { id: l.Operator.id, code: l.Operator.code, name: l.Operator.name } : null,
                msisdn_masked: maskMsisdn(l.msisdn),
                provider_txn_id: l.provider_txn_id || null,
                error_code: l.error_code || null,
                error_message: l.error_message || null,
                createdAt: l.createdAt,
            })),
            topup_status: (it.TopupLogs?.[0]?.status) || "pending",
        }));
        const allLogs = items.flatMap(i => i.topup_logs);
        const summary = {
            payment_status: payments.findLast(p => true)?.status || "created",
            topup_status: items[0]?.topup_status || "pending",
            can_refund: row.status === "paid" || row.status === "fulfilled",
            amounts: { order_minor: Number(row.total_minor), order_currency: row.currency },
            contact: { email: row.email ?? null, phone: row.phone ?? null },
        };
        const timeline = buildTimeline(row, payments, allLogs);


        res.json({
            data: {
                id: row.id,
                order_no: row.order_no,
                status: row.status,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                user_id: row.user_id ?? null,
                user_email: row.User?.email ?? null,
                currency: row.currency,
                total_minor: Number(row.total_minor),
                total_major: toMajor(row.total_minor, row.currency),
                email: row.email ?? null,
                phone: row.phone ?? null,
                items,
                payments,
                summary,
                timeline,
            }
        });
    } catch (e) { next(e); }
});

// Cancel (only if not paid/fulfilled)
ordersRouter.patch("/:id/cancel", requireAuth, async (req, res, next) => {
    try {
        const row = await Order.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        if (req.user.role !== "admin" && row.user_id !== req.user.id) return res.status(403).json({ error: "forbidden" });
        if (["paid", "fulfilled", "refunded", "cancelled"].includes(row.status)) {
            return res.status(400).json({ error: "cannot cancel in current state" });
        }
        row.status = "cancelled";
        await row.save();
        await audit(req.user.id, "order.cancel", "order", row.id);
        res.json({ data: row });
    } catch (e) { next(e); }
});

// Admin status change with guards
const allowed = {
    created: ["paid", "cancelled"],
    paid: ["fulfilled", "refunded"],
    fulfilled: ["refunded"],
    cancelled: [],
    refunded: []
};

ordersRouter.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { status } = req.body || {};
        const row = await Order.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: "not found" });
        const nexts = allowed[row.status] || [];
        if (!nexts.includes(status)) return res.status(400).json({ error: `invalid transition from ${row.status} -> ${status}` });
        const before = row.status;
        row.status = status;
        await row.save();
        await audit(req.user.id, "order.status", "order", row.id, { before, after: status });
        res.json({ data: row });
    } catch (e) { next(e); }
});


