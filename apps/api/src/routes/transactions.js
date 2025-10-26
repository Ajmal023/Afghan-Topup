import { Router } from "express";
import { Transaction, ApiSataragan, Setting, PromoUse, PromoCode } from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";
import { StripeService } from "../services/stripeService.js";

export const transactionsRouter = Router();


transactionsRouter.get("/:uid", requireApiKey, async (req, res, next) => {
    try {
        const { uid } = req.params;
        console.log("Fetching transactions for UID:", uid);
        
        const transactions = await Transaction.findAll({
            where: {
                uid: uid,
                status: { [Op.in]: ['Paid', 'Confirmed', 'Rejected'] }
            },
            order: [['createdAt', 'DESC']]
        });

        res.json({ data: transactions });
    } catch (error) {
        if (error.message.includes("Unauthorized")) {
            return res.status(401).json({ data: "Unauthorized" });
        }
        next(error);
    }
});


transactionsRouter.get("/sataragan/orders", async (req, res, next) => {
    try {
        const { filter, searchQuery, startDate, endDate, page = 1, limit = 10 } = req.query;
        
        const where = {};
        
        if (filter === 'ID' && searchQuery) {
            where.txn_id = { [Op.iLike]: `%${searchQuery}%` };
        } else if (filter === 'Phone Number' && searchQuery) {
            where.customer_mobile = { [Op.iLike]: `%${searchQuery}%` };
        }

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const { count, rows: orders } = await ApiSataragan.findAndCountAll({
            where,
            include: [{ model: Transaction }],
            order: [['createdAt', 'DESC']],
            offset,
            limit: parseInt(limit)
        });

        res.json({
            orders: {
                data: orders,
                meta: { 
                    current_page: parseInt(page), 
                    per_page: parseInt(limit), 
                    total: count,
                    last_page: Math.ceil(count / parseInt(limit))
                }
            },
            data: orders
        });
    } catch (error) {
        next(error);
    }
});


transactionsRouter.get("/internal/orders", async (req, res, next) => {
    try {
        const { filter, searchQuery, startDate, endDate, page = 1, limit = 10 } = req.query;
        
        const where = { output: 1 };
        
        if (filter === 'ID' && searchQuery) {
            where.id = { [Op.iLike]: `%${searchQuery}%` };
        } else if (filter === 'Phone Number' && searchQuery) {
            where.phone_number = { [Op.iLike]: `%${searchQuery}%` };
        } else if (filter === 'UID' && searchQuery) {
            where.uid = { [Op.iLike]: `%${searchQuery}%` };
        }

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const { count, rows: orders } = await Transaction.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            offset,
            limit: parseInt(limit)
        });

        res.json({
            data: orders,
            meta: { 
                current_page: parseInt(page), 
                per_page: parseInt(limit), 
                total: count,
                last_page: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
});


transactionsRouter.get("/admin/transactions/unchecked", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status,
            startDate,
            endDate,
            sortBy = "createdAt",
            sortOrder = "DESC"
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const where = { is_checked: false };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        if (search) {
            where[Op.or] = [
                { id: { [Op.iLike]: `%${search}%` } },
                { uid: { [Op.iLike]: `%${search}%` } },
                { phone_number: { [Op.iLike]: `%${search}%` } },
                { payment_id: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows: transactions } = await Transaction.findAndCountAll({
            where,
            include: [
                {
                    model: ApiSataragan,
                    attributes: ['id', 'status', 'message', 'txn_id', 'createdAt']
                },
                {
                    model: PromoUse,
                    as: 'PromoUses',
                    required: false,
                    include: [{
                        model: PromoCode,
                        as: 'PromoCode',
                        attributes: ['code', 'discount_type', 'discount_value']
                    }]
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            offset,
            limit: parseInt(limit)
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            data: transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching unchecked transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


transactionsRouter.post("/admin/transactions/:id/check", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findByPk(id);
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        await transaction.update({ is_checked: true });

        res.json({ 
            message: 'Transaction marked as checked',
            data: transaction 
        });
    } catch (error) {
        console.error('Error marking transaction as checked:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


transactionsRouter.post("/admin/transactions/bulk-check", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { transactionIds } = req.body;

        if (!transactionIds || !Array.isArray(transactionIds)) {
            return res.status(400).json({ error: "Transaction IDs are required" });
        }

        const result = await Transaction.update(
            { is_checked: true },
            {
                where: {
                    id: {
                        [Op.in]: transactionIds
                    }
                }
            }
        );

        res.json({
            message: `${result[0]} transactions marked as checked`,
            updatedCount: result[0]
        });
    } catch (error) {
        console.error('Error bulk checking transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


transactionsRouter.post("/approve-order", async (req, res, next) => {
    try {
        const { id } = req.body;
        
        const transaction = await Transaction.findByPk(id);
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        await transaction.update({ status: "Confirmed" });
        
        res.json({ status: 200, message: 'Success' });
    } catch (error) {
        res.status(500).json({ status: 500, message: `Error ${error.message}` });
    }
});


transactionsRouter.post("/mark-paid", async (req, res, next) => {
    try {
        const { transaction_id } = req.body;
        
        const transaction = await Transaction.findByPk(transaction_id);
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        await transaction.update({ status: "Paid" });
        
        res.json({ data: transaction });
    } catch (error) {
        res.status(500).json({ data: `Error ${error.message}` });
    }
});

transactionsRouter.get("/admin/transactions/stats", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        console.log('Stats request:', { startDate, endDate });
        
        const where = {};
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            where.createdAt = {
                [Op.between]: [today, tomorrow]
            };
        }

        const totalTransactions = await Transaction.count({ where });
        
        const statusCounts = await Transaction.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']
            ],
            group: ['status']
        });

        const totalAmount = await Transaction.sum('amount', { 
            where: { ...where, status: ['Paid', 'Confirmed'] } 
        });

        const successCount = await Transaction.count({ 
            where: { ...where, status: ['Paid', 'Confirmed'] } 
        });
        const successRate = totalTransactions > 0 ? (successCount / totalTransactions) * 100 : 0;

   
        const uncheckedCount = await Transaction.count({ 
            where: { ...where, is_checked: false } 
        });

        const stats = {
            total: totalTransactions,
            totalAmount: totalAmount || 0,
            successRate: Math.round(successRate * 100) / 100,
            uncheckedCount: uncheckedCount,
            byStatus: statusCounts.reduce((acc, item) => {
                acc[item.status] = {
                    count: parseInt(item.get('count')),
                    amount: parseFloat(item.get('totalAmount') || 0)
                };
                return acc;
            }, {})
        };

        res.json({ data: stats });
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


transactionsRouter.get("/admin/transactions", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status,
            startDate,
            endDate,
            uid,
            phone_number,
            is_checked,
            sortBy = "createdAt",
            sortOrder = "DESC"
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const where = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (is_checked !== undefined) {
            where.is_checked = is_checked === 'true';
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        if (search) {
            where[Op.or] = [
                { id: { [Op.iLike]: `%${search}%` } },
                { uid: { [Op.iLike]: `%${search}%` } },
                { phone_number: { [Op.iLike]: `%${search}%` } },
                { payment_id: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (uid) {
            where.uid = { [Op.iLike]: `%${uid}%` };
        }

        if (phone_number) {
            where.phone_number = { [Op.iLike]: `%${phone_number}%` };
        }

        const { count, rows: transactions } = await Transaction.findAndCountAll({
            where,
            include: [
                {
                    model: ApiSataragan,
                    attributes: ['id', 'status', 'message', 'txn_id', 'createdAt']
                },
                {
                    model: PromoUse,
                    as: 'PromoUses',
                    required: false,
                    include: [{
                        model: PromoCode,
                        as: 'PromoCode',
                        attributes: ['code', 'discount_type', 'discount_value']
                    }]
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            offset,
            limit: parseInt(limit)
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            data: transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching admin transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


transactionsRouter.get("/admin/transactions/:id/timeline", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findByPk(id, {
            include: [
                {
                    model: ApiSataragan,
                    attributes: ['id', 'status', 'message', 'txn_id', 'commission', 'createdAt']
                },
                {
                    model: PromoUse,
                    as: 'PromoUses',
                    required: false,
                    include: [{
                        model: PromoCode,
                        as: 'PromoCode',
                        attributes: ['code', 'discount_type', 'discount_value', 'description']
                    }]
                }
            ]
        });

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const timeline = [];

        timeline.push({
            event: 'Transaction Created',
            timestamp: transaction.createdAt,
            status: 'success',
            details: `Transaction initialized with amount $${transaction.amount}`
        });

        if (transaction.payment_id) {
            if (transaction.stripe_status === 'succeeded') {
                timeline.push({
                    event: 'Stripe Payment Succeeded',
                    timestamp: transaction.updatedAt,
                    status: 'success',
                    details: `Payment processed successfully via Stripe`
                });
            } else if (transaction.stripe_status === 'failed') {
                timeline.push({
                    event: 'Stripe Payment Failed',
                    timestamp: transaction.updatedAt,
                    status: 'error',
                    details: `Payment failed in Stripe`
                });
            }
        }

        if (transaction.ApiSataragans && transaction.ApiSataragans.length > 0) {
            transaction.ApiSataragans.forEach(sataragan => {
                timeline.push({
                    event: 'Sataragan API Call',
                    timestamp: sataragan.createdAt,
                    status: sataragan.status === 'Success' ? 'success' : 'error',
                    details: `Sataragan: ${sataragan.message || sataragan.status}`
                });
            });
        }

        timeline.push({
            event: `Status: ${transaction.status}`,
            timestamp: transaction.updatedAt,
            status: transaction.status === 'Confirmed' ? 'success' : 
                   transaction.status === 'Failed' ? 'error' : 'pending',
            details: `Transaction marked as ${transaction.status}`
        });

        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            data: {
                transaction,
                timeline
            }
        });
    } catch (error) {
        console.error('Error fetching transaction timeline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


transactionsRouter.post("/admin/transactions/:id/retry-sataragan", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findByPk(id);
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        if (transaction.status === 'Confirmed') {
            return res.status(400).json({ error: "Transaction already confirmed" });
        }

        await transaction.update({
            status: "Pending",
            output: 2
        });

        const stripeService = new StripeService();
        await stripeService.processTransaction(transaction);

        const updatedTransaction = await Transaction.findByPk(id);

        res.json({
            message: 'Transaction retry initiated',
            data: updatedTransaction
        });
    } catch (error) {
        console.error('Error retrying transaction:', error);
        res.status(500).json({ error: error.message });
    }
});


transactionsRouter.post("/admin/transactions/bulk-update", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { transactionIds, status } = req.body;

        if (!transactionIds || !Array.isArray(transactionIds) || !status) {
            return res.status(400).json({ error: "Transaction IDs and status are required" });
        }

        const result = await Transaction.update(
            { status },
            {
                where: {
                    id: {
                        [Op.in]: transactionIds
                    }
                }
            }
        );

        res.json({
            message: `${result[0]} transactions updated to ${status}`,
            updatedCount: result[0]
        });
    } catch (error) {
        console.error('Error bulk updating transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});