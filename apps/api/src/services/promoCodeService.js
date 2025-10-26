// src/services/promoCodeService.js
import { PromoCode, PromoUse, Customers, PromoCodeRequest, Transaction } from '../models/index.js';
import { Sequelize, Op } from "sequelize";
import { sequelize } from '../models/index.js'; 

export class PromoCodeService {
    
    async validatePromoCode(code, customerUid, orderAmount = 0) {
        try {
            const promoCode = await PromoCode.findOne({
                where: { 
                    code: code.trim().toUpperCase(),
                    is_active: true,
                    valid_from: { [Op.lte]: new Date() },
                    valid_until: { [Op.gte]: new Date() }
                }
            });

            if (!promoCode) {
                return { 
                    valid: false, 
                    error: 'Promo code not found or expired' 
                };
            }

            if (promoCode.used_count >= promoCode.usage_limit) {
                return { 
                    valid: false, 
                    error: 'Promo code usage limit reached' 
                };
            }

            if (promoCode.customer_uid && promoCode.customer_uid === customerUid) {
                    return { 
                        valid: false, 
                        error: 'You cannot use your own promo code' 
                    };
                }

            const minAmount = parseFloat(promoCode.min_order_amount) || 0;
            if (orderAmount < minAmount) {
                return { 
                    valid: false, 
                    error: `Minimum order amount ${minAmount} required` 
                };
            }

            const existingUse = await PromoUse.findOne({
                where: { 
                    promo_code_id: promoCode.id,
                    customer_uid: customerUid,
                    status: 'used'
                }
            });

            if (existingUse) {
                return { 
                    valid: false, 
                    error: 'Promo code already used by this customer' 
                };
            }

            return { 
                valid: true, 
                promoCode 
            };

        } catch (error) {
            console.error('Error validating promo code:', error);
            throw error;
        }
    }

    calculateDiscount(promoCode, orderAmount) {
        let discount = 0;
        const discountValue = parseFloat(promoCode.discount_value);
        const maxDiscount = promoCode.max_discount ? parseFloat(promoCode.max_discount) : null;

        if (promoCode.discount_type === 'fixed') {
            discount = Math.min(discountValue, orderAmount);
        } else if (promoCode.discount_type === 'percentage') {
            discount = (orderAmount * discountValue) / 100;
            
            if (maxDiscount && discount > maxDiscount) {
                discount = maxDiscount;
            }
        }

        discount = Math.min(discount, orderAmount);
        
        const finalAmount = orderAmount - discount;

        return {
            discount: Math.round(discount * 100) / 100,
            finalAmount: Math.round(finalAmount * 100) / 100
        };
    }

    async applyPromoCode(transactionId, promoCode, customerUid) {
        const transaction = await sequelize.transaction();

        try {
            const dbTransaction = await Transaction.findByPk(transactionId);
            if (!dbTransaction) {
                throw new Error('Transaction not found');
            }

            const orderAmount = parseFloat(dbTransaction.amount);
            const { discount, finalAmount } = this.calculateDiscount(promoCode, orderAmount);

            const promoUse = await PromoUse.create({
                promo_code_id: promoCode.id,
                customer_uid: customerUid,
                transaction_id: transactionId,
                original_amount: orderAmount,
                discount_amount: discount,
                final_amount: finalAmount,
                status: 'used',
                applied: true
            }, { transaction });

            await PromoCode.update(
                { used_count: promoCode.used_count + 1 },
                { 
                    where: { id: promoCode.id },
                    transaction 
                }
            );

            await Transaction.update(
                { 
                    amount: finalAmount,
                    original_amount: orderAmount,
                    discount_amount: discount,
                    promo_code_id: promoCode.id
                },
                { 
                    where: { id: transactionId },
                    transaction 
                }
            );

            await transaction.commit();

            return {
                success: true,
                originalAmount: orderAmount,
                discount,
                finalAmount,
                promoUse
            };

        } catch (error) {
            await transaction.rollback();
            console.error('Error applying promo code:', error);
            throw error;
        }
    }

    async createPromoCodeRequest(customerUid, requestData) {
        try {
            await Customers.upsert({
                uid: customerUid,
                first_name: requestData.first_name,
                last_name: requestData.last_name,
                profile_image: requestData.profile_image,
                whatsapp_number: requestData.whatsapp_number,
                email: requestData.email,
                id_document: requestData.id_document,
                address: requestData.address,
                facebook_link: requestData.facebook_link,
                tiktok_link: requestData.tiktok_link,
                instagram_link: requestData.instagram_link
            });

            const promoRequest = await PromoCodeRequest.create({
                customer_uid: customerUid,
                ...requestData,
                status: 'pending'
            });

            return promoRequest;

        } catch (error) {
            console.error('Error creating promo code request:', error);
            throw error;
        }
    }


async getCustomerPromoCodes(customerUid) {
    try {
        const promoCodes = await PromoCode.findAll({
            where: {
                [Op.or]: [
                    { is_public: true },
                    { customer_uid: customerUid }
                ],
                is_active: true,
                valid_until: { [Op.gte]: new Date() }
            },
            include: [{
                model: PromoUse,
                as: 'PromoUses',
                where: { 
                    customer_uid: customerUid,
                    status: 'used'
                },
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });

        return promoCodes.map(code => ({
            ...code.toJSON(),
            used: code.PromoUses && code.PromoUses.length > 0,
            isOwner: code.customer_uid === customerUid, 
            canUse: code.customer_uid !== customerUid 
        }));

    } catch (error) {
        console.error('Error getting customer promo codes:', error);
        throw error;
    }
}
    async createPromoCode(adminId, promoData) {
        try {
            const code = promoData.code.trim().toUpperCase();
               const existingCode = await PromoCode.findOne({ 
            where: { code } 
                });
                
                if (existingCode) {
                    throw new Error('Promo code already exists');
                }

            const finalCode = code || this.generatePromoCode();

             const promoCode = await PromoCode.create({
            ...promoData,
            created_by: adminId,
            code: finalCode
        });
        if (promoCode.customer_uid) {
            const owner = await Customers.findOne({
                where: { uid: promoCode.customer_uid },
                attributes: ['uid', 'first_name', 'last_name', 'email', 'whatsapp_number']
            });
            
            return {
                ...promoCode.toJSON(),
                owner: owner ? {
                    uid: owner.uid,
                    name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim(),
                    email: owner.email,
                    whatsapp_number: owner.whatsapp_number
                } : null
            };
        }

     
            return promoCode;

        } catch (error) {
            console.error('Error creating promo code:', error);
            throw error;
        }
    }
    generatePromoCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

    async updatePromoRequestStatus(requestId, adminId, status, adminNotes = null) {
        const transaction = await sequelize.transaction();

        try {
            const request = await PromoCodeRequest.findByPk(requestId);
            if (!request) {
                throw new Error('Promo code request not found');
            }

            await request.update({
                status,
                admin_notes: adminNotes,
                handled_by: adminId,
                handled_at: new Date()
            }, { transaction });

            await transaction.commit();
            return request;

        } catch (error) {
            await transaction.rollback();
            console.error('Error updating promo request status:', error);
            throw error;
        }
    }

    async getPromoCodeUsageStats(promoCodeId) {
        try {
            const totalDiscount = await PromoUse.sum('discount_amount', {
                where: { 
                    promo_code_id: promoCodeId,
                    status: 'used'
                }
            });

            const uniqueCustomers = await PromoUse.count({
                where: { 
                    promo_code_id: promoCodeId,
                    status: 'used'
                },
                distinct: true,
                col: 'customer_uid'
            });

            const promoCode = await PromoCode.findByPk(promoCodeId);
            if (!promoCode) {
                throw new Error('Promo code not found');
            }

            return {
                promoCode,
                usageCount: promoCode.used_count,
                totalDiscount: totalDiscount || 0,
                uniqueCustomers,
                usageRate: promoCode.usage_limit > 0 ? (promoCode.used_count / promoCode.usage_limit) * 100 : 0
            };

        } catch (error) {
            console.error('Error getting promo code usage stats:', error);
            throw error;
        }
    }
}