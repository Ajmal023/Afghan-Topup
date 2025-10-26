import { Router } from "express";
import { Op } from "sequelize";
import { TopupLog, Operator, OrderItem, ProductVariant, Order } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { redactPayload } from "../utils/redact.js";

export const topupLogsRouter = Router();

// GET /api/topup-logs?provider=&status=&operator=&msisdn=&from=&to=&page=&limit=
topupLogsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { provider, status, operator, msisdn, from, to, page = 1, limit = 20 } = req.query;
        const where = {};
        if (provider) where.provider = provider;
        if (status) where.status = status;
        if (msisdn) where.msisdn = { [Op.iLike]: `%${msisdn}%` };

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }

        const include = [
            { model: OrderItem, include: [{ model: ProductVariant }] },
            { model: Operator }
        ];

        if (operator) include[1].where = { id: operator };

        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await TopupLog.findAndCountAll({
            where, include, order: [["createdAt", "DESC"]], offset, limit: Number(limit)
        });

        // lightweight masking in list view
        const data = rows.map(r => ({
            id: r.id,
            provider: r.provider,
            operator_id: r.operator_id,
            order_item_id: r.order_item_id,
            msisdn: r.msisdn ? r.msisdn.slice(0, 3) + "*****" + r.msisdn.slice(-2) : null,
            status: r.status,
            provider_txn_id: r.provider_txn_id,
            createdAt: r.createdAt,
            error_code: r.error_code,
            error_message: r.error_message
        }));

        res.json({ data, meta: { page: Number(page), limit: Number(limit), count } });
    } catch (e) { next(e); }
});

// GET /api/topup-logs/:id  (mask secrets but return full request/response bodies)
topupLogsRouter.get("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const row = await TopupLog.findByPk(req.params.id, {
            include: [
                { model: Operator },
                { model: OrderItem, include: [{ model: ProductVariant }, { model: Order }] }
            ]
        });
        if (!row) return res.status(404).json({ error: "not found" });

        res.json({
            data: {
                ...row.toJSON(),
                request_payload: redactPayload(row.request_payload),
                response_payload: redactPayload(row.response_payload),
                msisdn: row.msisdn ? row.msisdn.slice(0, 3) + "*****" + row.msisdn.slice(-2) : null
            }
        });
    } catch (e) { next(e); }
});
