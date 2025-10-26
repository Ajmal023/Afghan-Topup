import { Router } from "express";
import { 
    Customers, 
    Transaction, 
    SetaraganTopup, 
    Package, 
    PromoCode, 
    PromoUse,
    SataraganBalance 
} from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const analyticsRouter = Router();

function getDateRange(filter) {
    const now = new Date();
    let startDate, endDate;
    switch (filter) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            startDate = new Date(0); 
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
}

analyticsRouter.get("/admin/analytics", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const { startDate, endDate } = getDateRange(period);

        console.log('Analytics request:', { period, startDate, endDate });

        const dateWhere = {
            createdAt: {
                [Op.between]: [startDate, endDate]
            }
        };
        const customerWhere = period === 'today' ? dateWhere : {};

        const [
            totalCustomers,
            newCustomers,
            successTransactions,
            transactionAmounts,
            topupData,
            currentBalance,
            totalPackages,
            promoCodeStats,
            promoUsageStats,
            successTopups,
            dailyTransactions,
            operatorTopups,
            promoCodeTypes
        ] = await Promise.all([
            Customers.count(),
            Customers.count({ where: dateWhere }),

            Transaction.count({
                where: {
                    ...dateWhere,
                    status: { [Op.in]: ['Paid', 'Confirmed'] }
                }
            }),

            Transaction.findAll({
                where: {
                    ...dateWhere,
                    status: { [Op.in]: ['Paid', 'Confirmed'] },
                    stripe_status: 'succeeded'
                },
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('original_amount')), 'totalOriginal'],
                    [Sequelize.fn('SUM', Sequelize.col('discount_amount')), 'totalDiscount'],
                    [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalFinal']
                ],
                raw: true
            }),

            SetaraganTopup.sum('amount', {
                where: {
                    ...dateWhere,
                    status: 'Success'
                }
            }),

            SataraganBalance.findOne({
                order: [['createdAt', 'DESC']],
                attributes: ['current_balance']
            }),

            Package.count(),
            Promise.all([
                PromoCode.count(),
                PromoCode.count({
                    where: {
                        used_count: { [Op.gt]: 0 }
                    }
                }),
                PromoCode.count({ where: dateWhere })
            ]),
            PromoUse.findAll({
                where: {
                    ...dateWhere,
                    status: 'used'
                },
                attributes: [
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalUsage'],
                    [Sequelize.fn('SUM', Sequelize.col('discount_amount')), 'totalDiscountAmount']
                ],
                raw: true
            }),
            SetaraganTopup.count({
                where: {
                    ...dateWhere,
                    status: 'Success'
                }
            }),
            Transaction.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()]
                    },
                    status: { [Op.in]: ['Paid', 'Confirmed'] }
                },
                attributes: [
                    [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                    [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
                ],
                group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
                order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
                raw: true
            }),

            SetaraganTopup.findAll({
                where: {
                    ...dateWhere,
                    status: 'Success'
                },
                attributes: [
                    'operator_id',
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                    [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
                ],
                group: ['operator_id'],
                raw: true
            }),

      
            PromoCode.findAll({
                attributes: [
                    'discount_type',
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                group: ['discount_type'],
                raw: true
            })
        ]);

 
        const transactionAmount = transactionAmounts[0] || { 
            totalOriginal: 0, 
            totalDiscount: 0, 
            totalFinal: 0 
        };
        const promoUsage = promoUsageStats[0] || { totalUsage: 0, totalDiscountAmount: 0 };
        const [totalPromoCodes, usedPromoCodes, newPromoCodes] = promoCodeStats;

        const analyticsData = {
            cards: {
         
                totalCustomers: totalCustomers || 0,
                newCustomers: newCustomers || 0,
                successTransactions: successTransactions || 0,
                totalOriginalAmount: parseFloat(transactionAmount.totalOriginal || 0),
                totalDiscountAmount: parseFloat(transactionAmount.totalDiscount || 0),
                totalFinalAmount: parseFloat(transactionAmount.totalFinal || 0),
                totalTopupAmount: parseFloat(topupData || 0),
                currentBalance: currentBalance ? parseFloat(currentBalance.current_balance) : 0,
                successTopups: successTopups || 0,
                totalPackages: totalPackages || 0,
                totalPromoCodes: totalPromoCodes || 0,
                newPromoCodes: newPromoCodes || 0,
                totalPromoCodeUsage: parseInt(promoUsage.totalUsage) || 0,
                totalPromoUsedAmount: parseFloat(promoUsage.totalDiscountAmount || 0),
                usedPromoCodes: usedPromoCodes || 0,
                availablePromoCodes: (totalPromoCodes || 0) - (usedPromoCodes || 0)
            },

            charts: {
                dailyTransactions: dailyTransactions.map(item => ({
                    date: item.date,
                    count: parseInt(item.count) || 0,
                    amount: parseFloat(item.amount) || 0
                })),
                operatorTopups: operatorTopups.map(item => ({
                    operator: `Operator ${item.operator_id}`,
                    count: parseInt(item.count) || 0,
                    amount: parseFloat(item.amount) || 0
                })),
                promoCodeTypes: promoCodeTypes.map(item => ({
                    type: item.discount_type,
                    count: parseInt(item.count) || 0
                }))
            },

            meta: {
                period,
                startDate,
                endDate,
                generatedAt: new Date()
            }
        };

        console.log('✅ Analytics data generated successfully');
        console.log('📊 Customer Stats:', {
            totalCustomers: analyticsData.cards.totalCustomers,
            newCustomers: analyticsData.cards.newCustomers
        });

        res.json({ success: true, data: analyticsData });

    } catch (error) {
        console.error('❌ Error generating analytics:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate analytics data',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


analyticsRouter.get("/admin/analytics/customers", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const { startDate, endDate } = getDateRange(period);

        const customerStats = await Customers.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date']
            ],
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
            raw: true
        });

        res.json({ 
            success: true, 
            data: {
                period,
                customerStats: customerStats.map(item => ({
                    date: item.date,
                    count: parseInt(item.total) || 0
                })),
                total: customerStats.reduce((sum, item) => sum + parseInt(item.total || 0), 0)
            }
        });
    } catch (error) {
        console.error('Error fetching customer analytics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

analyticsRouter.get("/admin/analytics/transaction-trends", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();
        const trends = await Transaction.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
                [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount'],
                [Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status IN ('Paid', 'Confirmed') THEN 1 ELSE 0 END`)), 'success'],
                [Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'Failed' THEN 1 ELSE 0 END`)), 'failed']
            ],
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
            raw: true
        });

        const processedTrends = trends.map(item => ({
            date: item.date,
            total: parseInt(item.total) || 0,
            amount: parseFloat(item.amount) || 0,
            success: parseInt(item.success) || 0,
            failed: parseInt(item.failed) || 0,
            successRate: item.total ? ((parseInt(item.success) / parseInt(item.total)) * 100) : 0
        }));

        res.json({ success: true, data: processedTrends });
    } catch (error) {
        console.error('Error fetching transaction trends:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default analyticsRouter;