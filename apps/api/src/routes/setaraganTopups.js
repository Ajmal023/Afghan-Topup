import { Router } from "express";
import { SetaraganTopup, Transaction, SataraganBalance } from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const setaraganTopupsRouter = Router();



setaraganTopupsRouter.get("/admin/setaragan-topups", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status,
            startDate,
            endDate,
            customer_mobile,
            uid,
            sortBy = "createdAt",
            sortOrder = "DESC"
        } = req.query;

        console.log('📋 Setaragan topups request:', { 
            page, limit, search, status, startDate, endDate, customer_mobile, uid 
        });

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const where = {};


        if (status && status !== 'all') {
            where.status = status;
        }


        if (startDate || endDate) {
            const dateFilter = {};
            
            if (startDate) {
                const start = new Date(startDate + 'T00:00:00.000Z');
                dateFilter[Op.gte] = start;
                console.log('📅 Start date (UTC):', start);
            }
            
            if (endDate) {
                const end = new Date(endDate + 'T23:59:59.999Z');
                dateFilter[Op.lte] = end;
                console.log('📅 End date (UTC):', end);
            }
            
            where.createdAt = dateFilter;
            console.log('📅 Date filter applied:', dateFilter);
        }


        if (search) {
            where[Op.or] = [
                { customer_mobile: { [Op.iLike]: `%${search}%` } },
                { uid: { [Op.iLike]: `%${search}%` } },
                { txn_id: { [Op.iLike]: `%${search}%` } },
                { request_id: { [Op.iLike]: `%${search}%` } }
            ];
        }


        if (customer_mobile) {
            where.customer_mobile = { [Op.iLike]: `%${customer_mobile}%` };
        }


        if (uid) {
            where.uid = { [Op.iLike]: `%${uid}%` };
        }

        console.log('📋 Final where clause:', JSON.stringify(where, null, 2));

        const { count, rows: topups } = await SetaraganTopup.findAndCountAll({
            where,
            include: [{
                model: Transaction,
                attributes: ['id', 'amount', 'payment_id', 'status', 'original_amount', 'discount_amount', 'promo_code']
            }],
            order: [[sortBy, sortOrder.toUpperCase()]],
            offset,
            limit: parseInt(limit)
        });

        console.log('📋 Found Setaragan topups:', count);

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            data: topups,
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
        console.error('Error fetching Setaragan topups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


setaraganTopupsRouter.get("/admin/setaragan-topups/stats", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        console.log('📊 Setaragan stats request:', { startDate, endDate });
        
        const where = {};
        

        if (startDate || endDate) {
            const dateFilter = {};
            
            if (startDate) {
                const start = new Date(startDate + 'T00:00:00.000Z');
                dateFilter[Op.gte] = start;
            }
            
            if (endDate) {
                const end = new Date(endDate + 'T23:59:59.999Z');
                dateFilter[Op.lte] = end;
            }
            
            where.createdAt = dateFilter;
            console.log('📊 Stats date filter (UTC):', dateFilter);
        } else {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(0, 0, 0, 0);
            
            where.createdAt = {
                [Op.between]: [today, tomorrow]
            };
            console.log('📊 Default stats date range (UTC today):', today, 'to', tomorrow);
        }


        const totalTopups = await SetaraganTopup.count({ where });
        

        const totalAmount = await SetaraganTopup.sum('amount', { where });
        

        const totalCommission = await SetaraganTopup.sum('commission', { where });
        

        const successCount = await SetaraganTopup.count({ 
            where: { ...where, status: 'Success' } 
        });
        const successRate = totalTopups > 0 ? (successCount / totalTopups) * 100 : 0;


        const statusCounts = await SetaraganTopup.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']
            ],
            group: ['status']
        });


        let currentBalance = 0;
        

        const currentBalanceRecord = await SataraganBalance.findOne({ 
            order: [['createdAt', 'DESC']] 
        });
        
        if (currentBalanceRecord) {
            currentBalance = currentBalanceRecord.current_balance;
            console.log('💰 Current balance from SataraganBalance:', currentBalance);
        } else {
            const latestTopup = await SetaraganTopup.findOne({
                order: [['createdAt', 'DESC']],
                attributes: ['current_balance']
            });
            
            if (latestTopup) {
                currentBalance = latestTopup.current_balance;
                console.log('💰 Current balance from latest topup:', currentBalance);
            } else {
                const allTopups = await SetaraganTopup.findAll({
                    order: [['createdAt', 'ASC']]
                });
                
                if (allTopups.length > 0) {
                    const firstTopup = allTopups[0];
                    let balance = firstTopup.previous_balance || 0;
                    
                    for (const topup of allTopups) {
                        balance -= parseFloat(topup.amount);
                    }
                    
                    currentBalance = balance;
                    console.log('💰 Current balance calculated from all topups:', currentBalance);
                }
            }
        }

        const stats = {
            total: totalTopups,
            totalAmount: totalAmount || 0,
            totalCommission: totalCommission || 0,
            successRate: Math.round(successRate * 100) / 100,
            currentBalance: currentBalance,
            byStatus: statusCounts.reduce((acc, item) => {
                acc[item.status] = {
                    count: parseInt(item.get('count')),
                    amount: parseFloat(item.get('totalAmount') || 0)
                };
                return acc;
            }, {})
        };

        console.log('Setaragan stats result:', JSON.stringify(stats, null, 2));

        res.json({ data: stats });
    } catch (error) {
        console.error('Error fetching Setaragan stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
setaraganTopupsRouter.get("/admin/setaragan-balance/history", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 50,
            startDate,
            endDate 
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const where = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        const { count, rows: balanceHistory } = await SataraganBalance.findAndCountAll({
            where,
            include: [{
                model: Transaction,
                attributes: ['id', 'uid', 'phone_number', 'amount']
            }],
            order: [['createdAt', 'DESC']],
            offset,
            limit: parseInt(limit)
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            data: balanceHistory,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching balance history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


setaraganTopupsRouter.get("/admin/setaragan-topups/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const topup = await SetaraganTopup.findByPk(id, {
            include: [{
                model: Transaction,
                attributes: ['id', 'amount', 'payment_id', 'status', 'original_amount', 'discount_amount', 'promo_code', 'createdAt']
            }]
        });

        if (!topup) {
            return res.status(404).json({ error: "Setaragan topup not found" });
        }

        res.json({ data: topup });
    } catch (error) {
        console.error('Error fetching Setaragan topup details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



setaraganTopupsRouter.get("/admin/setaragan-topups/export", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const where = {};
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        const topups = await SetaraganTopup.findAll({
            where,
            include: [{
                model: Transaction,
                attributes: ['payment_id', 'original_amount', 'discount_amount', 'promo_code']
            }],
            order: [['createdAt', 'DESC']]
        });

        // Convert to CSV
        const csvHeaders = [
            'Transaction ID',
            'Customer Mobile',
            'UID',
            'Amount',
            'TXN ID',
            'Status',
            'Current Balance',
            'Previous Balance',
            'Commission',
            'Request ID',
            'Operator ID',
            'Message',
            'Created At'
        ].join(',');

        const csvRows = topups.map(topup => [
            topup.transaction_id,
            topup.customer_mobile,
            topup.uid,
            topup.amount,
            topup.txn_id,
            topup.status,
            topup.current_balance,
            topup.previous_balance,
            topup.commission,
            topup.request_id,
            topup.operator_id,
            `"${(topup.message || '').replace(/"/g, '""')}"`,
            topup.createdAt.toISOString()
        ].join(','));

        const csv = [csvHeaders, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=setaragan-topups-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting Setaragan topups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default setaraganTopupsRouter;