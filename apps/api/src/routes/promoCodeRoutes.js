import { Router } from "express";
import { Op } from "sequelize";
import { PromoCodeService } from "../services/promoCodeService.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";
import { Customers, PromoCodeRequest, PromoCode, PromoUse, Transaction } from "../models/index.js";

const promoRouter = Router();
const promoCodeService = new PromoCodeService();


promoRouter.get("/admin/debug-associations", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const tests = {
            basicPromoCodes: await PromoCode.count(),
            promoCodeWithRequest: await PromoCode.findOne({
                include: [{
                    model: PromoCodeRequest,
                    as: 'PromoCodeRequest',
                    required: false
                }]
            }),
            promoCodeWithUses: await PromoCode.findOne({
                include: [{
                    model: PromoUse,
                    as: 'PromoUses',
                    required: false
                }]
            }),
            associations: {
                PromoCode: Object.keys(PromoCode.associations || {}),
                PromoCodeRequest: Object.keys(PromoCodeRequest.associations || {}),
                PromoUse: Object.keys(PromoUse.associations || {})
            }
        };
        
        res.json({ success: true, data: tests });
    } catch (error) {
        console.error('Debug association error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

promoRouter.post("/customer/profile", requireApiKey, async (req, res) => {
    try {
        const { uid, first_name, last_name, profile_image, whatsapp_number, email, 
                id_document, address, facebook_link, tiktok_link, instagram_link } = req.body;

        const profile = await Customers.upsert({
            uid,
            first_name,
            last_name,
            profile_image,
            whatsapp_number,
            email,
            id_document,
            address,
            facebook_link,
            tiktok_link,
            instagram_link
        });

        res.json({ success: true, data: profile[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.get("/customer/profile/:uid", requireApiKey, async (req, res) => {
    try {
        const profile = await Customers.findOne({ 
            where: { uid: req.params.uid } 
        });
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.get("/customer/promo-requests/:uid", requireApiKey, async (req, res) => {
    try {
        const requests = await PromoCodeRequest.findAll({ 
            where: { customer_uid: req.params.uid },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


promoRouter.get("/customer/owned-promo-codes/:uid", requireApiKey, async (req, res) => {
    try {
        const promoCodes = await PromoCode.findAll({
            where: { 
                customer_uid: req.params.uid
            },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: promoCodes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


promoRouter.get("/customer/promo-usage-stats/:uid", requireApiKey, async (req, res) => {
    try {
        const { uid } = req.params;
        
        console.log('Fetching promo usage stats for customer:', uid);
        const ownedPromoCodes = await PromoCode.findAll({
            where: { customer_uid: uid },
            order: [['createdAt', 'DESC']]
        });

        console.log(`Found ${ownedPromoCodes.length} owned promo codes`);

        const usageStats = await Promise.all(
            ownedPromoCodes.map(async (promoCode) => {
                try {
                    const usageData = await PromoUse.findAll({
                        where: { 
                            promo_code_id: promoCode.id,
                            status: 'used'
                        },
                        order: [['createdAt', 'DESC']]
                    });

          
                    const usageDetails = await Promise.all(
                        usageData.map(async (use) => {
                            let customerName = 'Unknown Customer';
                            let phoneNumber = 'N/A';
                            
                      
                            const customer = await Customers.findOne({
                                where: { uid: use.customer_uid },
                                attributes: ['first_name', 'last_name', 'whatsapp_number']
                            });
                            
                            if (customer) {
                                customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer';
                                phoneNumber = customer.whatsapp_number || 'N/A';
                            }
                         
                            const transaction = await Transaction.findOne({
                                where: { id: use.transaction_id },
                                attributes: ['amount', 'phone_number']
                            });
                            
                            if (transaction) {
                                phoneNumber = transaction.phone_number || phoneNumber;
                            }
                            
                            return {
                                id: use.id,
                                customer_name: customerName,
                                customer_uid: use.customer_uid,
                                discount_amount: parseFloat(use.discount_amount || 0),
                                transaction_amount: transaction ? parseFloat(transaction.amount) : null,
                                phone_number: phoneNumber,
                                used_at: use.createdAt
                            };
                        })
                    );

         
                    const totalDiscount = usageDetails.reduce((sum, use) => {
                        return sum + use.discount_amount;
                    }, 0);

                    return {
                        promoCode: {
                            id: promoCode.id,
                            code: promoCode.code,
                            description: promoCode.description,
                            discount_type: promoCode.discount_type,
                            discount_value: parseFloat(promoCode.discount_value),
                            max_discount: promoCode.max_discount ? parseFloat(promoCode.max_discount) : null,
                            min_order_amount: promoCode.min_order_amount ? parseFloat(promoCode.min_order_amount) : 0,
                            usage_limit: parseInt(promoCode.usage_limit),
                            used_count: parseInt(promoCode.used_count),
                            valid_from: promoCode.valid_from,
                            valid_until: promoCode.valid_until,
                            is_active: promoCode.is_active,
                            is_public: promoCode.is_public,
                            customer_uid: promoCode.customer_uid,
                            created_at: promoCode.createdAt
                        },
                        usageCount: usageData.length,
                        totalDiscount: totalDiscount,
                        usageDetails: usageDetails
                    };
                } catch (error) {
                    console.error(`Error processing promo code ${promoCode.id}:`, error);
                    return {
                        promoCode: promoCode.toJSON(),
                        usageCount: 0,
                        totalDiscount: 0,
                        usageDetails: [],
                        error: error.message
                    };
                }
            })
        );

        console.log('success fetched promo usage stats');

        res.json({ 
            success: true, 
            data: usageStats 
        });
    } catch (error) {
        console.error('❌ Error fetching promo usage stats:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
promoRouter.post("/customer/promo-requests", requireApiKey, async (req, res) => {
    try {
        const { uid, ...requestData } = req.body;
        
        let customer = await Customers.findOne({ where: { uid } });
        if (!customer) {
            customer = await Customers.create({
                uid,
                first_name: requestData.first_name,
                last_name: requestData.last_name,
                email: requestData.email,
                whatsapp_number: requestData.whatsapp_number
            });
        }
        
        const request = await promoCodeService.createPromoCodeRequest(uid, requestData);
        res.json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.get("/customer/promo-requests/:uid", requireApiKey, async (req, res) => {
    try {
        const requests = await PromoCodeRequest.findAll({ 
            where: { customer_uid: req.params.uid },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.get("/customer/promo-codes/:uid", requireApiKey, async (req, res) => {
    try {
        const codes = await promoCodeService.getCustomerPromoCodes(req.params.uid);
        res.json({ success: true, data: codes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


promoRouter.post("/validate-promo", requireApiKey, async (req, res) => {
    try {
        const { code, customer_uid, order_amount } = req.body;
        
        if (!code) {
            return res.status(400).json({ success: false, error: "Promo code is required" });
        }

        if (!customer_uid) {
            return res.status(400).json({ success: false, error: "Customer UID is required" });
        }

        const validation = await promoCodeService.validatePromoCode(
            code, 
            customer_uid, 
            parseFloat(order_amount || 0)
        );
        
        if (validation.valid) {
            const discount = promoCodeService.calculateDiscount(validation.promoCode, parseFloat(order_amount));
            
            res.json({ 
                success: true, 
                data: { 
                    id: validation.promoCode.id,
                    code: validation.promoCode.code,
                    type: validation.promoCode.discount_type,
                    value: parseFloat(validation.promoCode.discount_value),
                    minOrderAmount: parseFloat(validation.promoCode.min_order_amount || 0),
                    maxDiscount: validation.promoCode.max_discount ? parseFloat(validation.promoCode.max_discount) : null,
                    usageLimit: parseInt(validation.promoCode.usage_limit),
                    usedCount: parseInt(validation.promoCode.used_count),
                    expiresAt: validation.promoCode.valid_until,
                    status: validation.promoCode.is_active ? 'active' : 'inactive',
                    discount: parseFloat(discount.discount),
                    finalAmount: parseFloat(discount.finalAmount)
                } 
            });
        } else {
            res.json({ success: false, error: validation.error });
        }
    } catch (error) {
        console.error('Error validating promo code:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.get("/admin/promo-requests", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const requests = await PromoCodeRequest.findAndCountAll({
            where: status !== 'all' ? { status } : {},
            include: [{
                model: Customers,
                as: 'Customer'
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.put("/admin/promo-requests/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { status, admin_notes } = req.body;
        const request = await promoCodeService.updatePromoRequestStatus(
            req.params.id, req.user.id, status, admin_notes
        );
        res.json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



promoRouter.post("/admin/promo-codes", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { customer_uid, is_public = true, ...promoData } = req.body;
        
        console.log('Creating promo code with this data', {
            customer_uid,
            is_public,
            ...promoData
        });
        const finalIsPublic = customer_uid ? true : is_public;
        const finalPromoData = {
            ...promoData,
            is_public: finalIsPublic,
            customer_uid: customer_uid || null
        };
        console.log('final promo data being saved:', finalPromoData);
    
        const promoCode = await promoCodeService.createPromoCode(req.user.id, finalPromoData);
        res.json({ success: true, data: promoCode });
    } catch (error) {
        console.error('Error creating promo code:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


promoRouter.get("/admin/promo-codes", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', customer_uid } = req.query;
        
        console.log('Fetching promo codes with search:', search);
        
        const where = {};
        if (search) {
            where.code = { [Op.iLike]: `%${search}%` };
        }
        

        if (customer_uid) {
            where.customer_uid = customer_uid;
        }

        const codes = await PromoCode.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        const enhancedCodes = await Promise.all(
            codes.rows.map(async (code) => {
                try {
                    const [usesCount, promoRequest, owner] = await Promise.all([
                        PromoUse.count({
                            where: { 
                                promo_code_id: code.id,
                                status: 'used'
                            }
                        }),
                        code.promo_request_id ? PromoCodeRequest.findByPk(code.promo_request_id, {
                            include: [{
                                model: Customers,
                                as: 'Customer',
                                required: false
                            }]
                        }) : Promise.resolve(null),
                        code.customer_uid ? Customers.findOne({
                            where: { uid: code.customer_uid },
                            attributes: ['uid', 'first_name', 'last_name', 'email', 'whatsapp_number']
                        }) : Promise.resolve(null)
                    ]);
                    
                    return {
                        ...code.toJSON(),
                        usedCount: usesCount,
                        PromoCodeRequest: promoRequest,
                        Owner: owner, 
                        isOwned: !!code.customer_uid, 
                        canBeUsedByOthers: code.is_public || !!code.customer_uid 
                    };
                } catch (error) {
                    console.error(`Error enhancing promo code ${code.id}:`, error);
            
                    return {
                        ...code.toJSON(),
                        usedCount: 0,
                        isOwned: !!code.customer_uid,
                        canBeUsedByOthers: code.is_public || !!code.customer_uid
                    };
                }
            })
        );

        res.json({ 
            success: true, 
            data: {
                count: codes.count,
                rows: enhancedCodes
            }
        });
    } catch (error) {
        console.error('Error in /admin/promo-codes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch promo codes',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
promoRouter.get("/admin/customers/search", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ success: false, error: 'Search query is required' });
        }

        const where = {
            [Op.or]: [
                { uid: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } },
                { first_name: { [Op.iLike]: `%${q}%` } },
                { last_name: { [Op.iLike]: `%${q}%` } },
                { whatsapp_number: { [Op.iLike]: `%${q}%` } }
            ]
        };

        const customers = await Customers.findAndCountAll({
            where,
            attributes: ['uid', 'first_name', 'last_name', 'email', 'whatsapp_number', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({ 
            success: true, 
            data: {
                count: customers.count,
                rows: customers.rows
            }
        });
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.put("/admin/promo-codes/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const promoCode = await PromoCode.findByPk(req.params.id);
        if (!promoCode) {
            return res.status(404).json({ success: false, error: 'Promo code not found' });
        }
        await promoCode.update(req.body);
        res.json({ success: true, data: promoCode });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.delete("/admin/promo-codes/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const promoCode = await PromoCode.findByPk(req.params.id);
        if (!promoCode) {
            return res.status(404).json({ success: false, error: 'Promo code not found' });
        }
        await promoCode.destroy();
        res.json({ success: true, message: 'Promo code deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

promoRouter.get("/admin/promo-codes/:id/stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const stats = await promoCodeService.getPromoCodeUsageStats(req.params.id);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});




promoRouter.post("/admin/promo-requests/:id/create-promo", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const promoData = req.body;
        
        const request = await PromoCodeRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ success: false, error: 'Promo request not found' });
        }

        if (request.status !== 'approved') {
            return res.status(400).json({ success: false, error: 'Request must be approved first' });
        }

    
        const promoCode = await promoCodeService.createPromoCode(req.user.id, {
            ...promoData,
            customer_uid: request.customer_uid,
            is_public: true,
            promo_request_id: id
        });

        res.json({ success: true, data: promoCode });
    } catch (error) {
        console.error('Error creating promo code from request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
promoRouter.get("/admin/promo-uses", requireAuth, requireRole("admin"), async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        
        const where = {};
        

        if (search) {
            where[Op.or] = [
                { '$PromoCode.code$': { [Op.iLike]: `%${search}%` } },
                { '$Customer.first_name$': { [Op.iLike]: `%${search}%` } },
                { '$Customer.last_name$': { [Op.iLike]: `%${search}%` } },
                { '$Customer.email$': { [Op.iLike]: `%${search}%` } },
                { '$Customer.whatsapp_number$': { [Op.iLike]: `%${search}%` } }
            ];
        }

        const uses = await PromoUse.findAndCountAll({
            where,
            include: [
                {
                    model: PromoCode,
                    as: 'PromoCode',
                    attributes: ['id', 'code', 'description', 'discount_type', 'discount_value', 'is_public', 'customer_uid'],
                    required: false
                },
                {
                    model: Customers,
                    as: 'Customer',
                    attributes: ['uid', 'first_name', 'last_name', 'email', 'whatsapp_number'],
                    required: false
                },
                {
                    model: Transaction,
                    as: 'Transaction',
                    attributes: ['id', 'phone_number', 'amount', 'status', 'createdAt'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({ 
            success: true, 
            data: {
                count: uses.count,
                rows: uses.rows
            }
        });
    } catch (error) {
        console.error('Error fetching promo uses:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});


export { promoRouter };