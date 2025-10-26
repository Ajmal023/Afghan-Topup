import Stripe from 'stripe';
import { Transaction, ApiSataragan, SataraganBalance, Setting, PromoUse, PromoCode, SetaraganTopup } from '../models/index.js';
import axios from 'axios';
import { PromoCodeService } from './promoCodeService.js';
import { sequelize } from '../models/index.js';

export class StripeService {
constructor() {
    this.stripeTest = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16'
    });
    this.promoCodeService = new PromoCodeService();
    this.server = 2;
    this.init();
}

    async init() {
        try {
            const serverSetting = await Setting.findOne({ where: { setting_name: 'server' } });
            if (serverSetting) {
                this.server = parseInt(serverSetting.value);
            }
        } catch (error) {
            console.error('Error initializing StripeService:', error);
        }
    }

    stripQuotes(text) {
        return text.replace(/^(\'(.*)\'|"(.*)")$/, '$2$3');
    }

    getPhoneNumberCategory(phoneNumber) {
        const firstTwoDigits = phoneNumber.substring(0, 2);
        
        if (firstTwoDigits === "74") return '1';
        if (firstTwoDigits === "73" || firstTwoDigits === "78") return '2';
        if (firstTwoDigits === "72" || firstTwoDigits === "79") return '3';
        if (firstTwoDigits === "77" || firstTwoDigits === "76") return '4';
        if (firstTwoDigits === "70" || firstTwoDigits === "71") return '5';
        
        return '1';
    }

    async sendToSataragan(transaction) {
        try {
            const url = 'http://3.67.144.22/backend/V1/api/setaragan/topup';
            
            console.log('Sending to Sataragan API - Transaction:', {
                phone_number: transaction.phone_number,
                value: transaction.value,
                transaction_id: transaction.id
            });

            const data = {
                'operator_id': this.getPhoneNumberCategory(transaction.phone_number),
                'customer_mobile': transaction.phone_number,
                'amount': transaction.value.toString(),
                'msisdn': '730302030',
                'request_id': Date.now().toString(),
            };

            console.log('Sataragan request data:', data);

            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Sataragan API raw response:', response.data);

            let responseData = response.data;
            
            if (response.data && response.data.json) {
                responseData = response.data.json;
            }
            
            if (responseData && responseData.data) {
                responseData = responseData.data;
            }

            console.log('Sataragan API processed data:', responseData);
            return responseData;

        } catch (error) {
            console.error('❌ Error sending to Sataragan:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }

    async paymentIntent2(request) {
        const { uid, phone_number, amount, currency = 'USD', real_amount, value, promo_code } = request.body;

        console.log('Creating payment intent:', {
            uid, phone_number, amount, currency, real_amount, value, promo_code
        });

        const transaction = await sequelize.transaction();
        try {
            let finalAmount = parseFloat(amount);
            let discountAmount = 0;
            let appliedPromoCode = null;

    
            if (promo_code) {
                const validation = await this.promoCodeService.validatePromoCode(
                    promo_code, uid, finalAmount
                );

                if (validation.valid) {
                    const discountCalc = this.promoCodeService.calculateDiscount(
                        validation.promoCode, finalAmount
                    );
                    
                    discountAmount = discountCalc.discount;
                    finalAmount = discountCalc.finalAmount;
                    appliedPromoCode = validation.promoCode;

                    console.log('Promo code applied:', {
                        code: promo_code,
                        discount: discountAmount,
                        finalAmount: finalAmount
                    });
                } else {
                    await transaction.rollback();
                    return {
                        success: false,
                        error: validation.error
                    };
                }
            }

            const customers = await this.stripeTest.customers.search({
                query: `name:"${this.stripQuotes(uid)}"`,
            });

            let customer;
            if (customers.data.length === 0) {
                customer = await this.stripeTest.customers.create({
                    description: phone_number,
                    name: uid,
                    metadata: { uid, phone_number } 
                });
                console.log('New customer created:', customer.id);
            } else {
                customer = customers.data[0];
                console.log('Existing customer found:', customer.id);
            }

            const ephemeralKey = await this.stripeTest.ephemeralKeys.create(
                { customer: customer.id },
                { apiVersion: '2023-10-16' }
            );

            console.log('Ephemeral key created');

  
            const paymentIntent = await this.stripeTest.paymentIntents.create({
                amount: Math.round(finalAmount * 100),
                currency: currency,
                customer: customer.id,
                description: `${uid} - ${phone_number}`,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    uid: uid,
                    phone_number: phone_number,
                    real_amount: real_amount || amount,
                    value: value,
                    promo_code: promo_code || '',
                    original_amount: amount,
                    discount_amount: discountAmount,
                    final_amount: finalAmount,
                    promo_code_id: appliedPromoCode ? appliedPromoCode.id : ''
                }
            });

            console.log('Payment intent created:', {
                status: paymentIntent.status,
                id: paymentIntent.id,
                client_secret: paymentIntent.client_secret ? 'present' : 'missing'
            });

            if (paymentIntent.status === 'requires_payment_method') {
               const newTransaction = await Transaction.create({
                    amount: finalAmount,
                    original_amount: parseFloat(amount),
                    discount_amount: discountAmount,
                    value: value,
                    phone_number: phone_number,
                    uid: uid,
                    status: "Pending",
                    payment_id: paymentIntent.id,
                    network: "Afghan Network",
                    output: this.server,
                    promo_code: promo_code || null,
                    promo_code_id: appliedPromoCode ? appliedPromoCode.id : null,
                    is_checked: false 
                }, { transaction });

                console.log('Transaction created with Pending status:', newTransaction.id);

           
       
                await transaction.commit();

                return {
                    success: true,
                    paymentIntent: paymentIntent.client_secret,
                    customer: paymentIntent.customer,
                    transaction_id: newTransaction.id,
                    ephemeral_key: ephemeralKey.secret,
                    discount_amount: discountAmount,
                    final_amount: finalAmount
                };
            } else {
                await transaction.rollback();
                console.error('❌ Payment intent not in correct state:', paymentIntent.status);
                throw new Error(`Payment intent status: ${paymentIntent.status}`);
            }
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error creating payment intent:', error);
            throw error;
        }
    }

    async handleWebhook(rawBody, signature) {
        try {
            console.log('Webhook received - Raw body length:', rawBody.length);
            console.log('Webhook signature:', signature);
            
            let event;
            try {
                event = this.stripeTest.webhooks.constructEvent(
                    rawBody, 
                    signature, 
                    "whsec_WwpLqBO5naZjemg87AZ5hxKqr6zn5hgy"
                );
            } catch (err) {
                console.error('❌ Webhook signature verification failed:', err.message);
                throw new Error(`Webhook signature verification failed: ${err.message}`);
            }

            console.log('Webhook event type:', event.type);
            console.log('Webhook event ID:', event.id);

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                        case 'charge.succeeded':  
                console.log('⚡ Handling charge.succeeded event');
         
                const paymentIntentId = event.data.object.payment_intent;
                if (paymentIntentId) {
                    const paymentIntent = await this.stripeTest.paymentIntents.retrieve(paymentIntentId);
                    await this.handlePaymentSucceeded(paymentIntent);
                } else {
                    console.log('No payment intent found in charge');
                }
                break
                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    console.log(`🤷 Unhandled event type: ${event.type}`);
            }

            return { success: true, eventId: event.id };
        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            throw error;
        }
    }


    async handlePaymentSucceeded(paymentIntent) {
        console.log('Processing successful payment:', paymentIntent.id);
        console.log('Payment intent metadata:', paymentIntent.metadata);

        const dbTransaction = await sequelize.transaction();
        try {
      
            const transaction = await Transaction.findOne({ 
                where: { payment_id: paymentIntent.id } 
            });

            if (!transaction) {
                console.error('Transaction not found for payment intent:', paymentIntent.id);
                
                if (paymentIntent.metadata && paymentIntent.metadata.uid) {
                    console.log('Creating transaction from webhook metadata');
                    const newTransaction = await Transaction.create({
                        amount: paymentIntent.metadata.final_amount || (paymentIntent.amount / 100).toString(),
                        value: paymentIntent.metadata.value || '0',
                        phone_number: paymentIntent.metadata.phone_number || 'Unknown',
                        uid: paymentIntent.metadata.uid || 'Unknown',
                        status: "Paid",
                        payment_id: paymentIntent.id,
                        network: "Afghan Network",
                        output: this.server,
                        promo_code: paymentIntent.metadata.promo_code || null,
                        original_amount: paymentIntent.metadata.original_amount || (paymentIntent.amount / 100).toString(),
                        discount_amount: paymentIntent.metadata.discount_amount || 0,
                        promo_code_id: paymentIntent.metadata.promo_code_id || null,
                        is_checked: false
                    }, { transaction: dbTransaction });
                    
                    console.log('New transaction created from webhook:', newTransaction.id);
                    
    
                    if (paymentIntent.metadata.promo_code) {
                        await this.recordPromoCodeUsage(newTransaction, paymentIntent.metadata, dbTransaction);
                    }
                    
                    await this.processTransaction(newTransaction, dbTransaction);
                    await dbTransaction.commit();
                } else {
                    await dbTransaction.rollback();
                    console.error('No metadata available to create transaction');
                }
                return;
            }

            console.log('Found transaction:', {
                id: transaction.id,
                status: transaction.status,
                payment_id: transaction.payment_id,
                promo_code: transaction.promo_code
            });


              if (transaction.status === "Pending" && transaction.promo_code) {
            await this.recordPromoCodeUsage(transaction, paymentIntent.metadata, dbTransaction);
        }

 
        await this.processTransaction(transaction, dbTransaction);

        await dbTransaction.commit();

        } catch (error) {
            await dbTransaction.rollback();
            console.error('Error handling payment succeeded:', error);
        }
    }


    async recordPromoCodeUsage(transaction, metadata, dbTransaction) {
        try {
            console.log('Recording promo code usage for transaction:', transaction.id);
            
            const promoCode = await PromoCode.findOne({ 
                where: { code: transaction.promo_code } 
            });

            if (!promoCode) {
                console.error('Promo code not found:', transaction.promo_code);
                return;
            }

            console.log('Found promo code:', {
                id: promoCode.id,
                code: promoCode.code,
                current_usage: promoCode.used_count,
                usage_limit: promoCode.usage_limit
            });

      
            const existingPromoUse = await PromoUse.findOne({
                where: { 
                    transaction_id: transaction.id,
                    promo_code_id: promoCode.id
                }
            });

            if (existingPromoUse) {
                await existingPromoUse.update({
                    status: 'used',
                    applied: true
                }, { transaction: dbTransaction });
                console.log('Existing PromoUse record updated');
            } else {
                await PromoUse.create({
                    promo_code_id: promoCode.id,
                    customer_uid: transaction.uid,
                    transaction_id: transaction.id,
                    original_amount: transaction.original_amount || parseFloat(metadata.original_amount),
                    discount_amount: transaction.discount_amount || parseFloat(metadata.discount_amount),
                    final_amount: transaction.amount,
                    status: 'used',
                    applied: true
                }, { transaction: dbTransaction });
                console.log('PromoUse record created');
            }


            const updatedCount = promoCode.used_count + 1;
            await PromoCode.update(
                { used_count: updatedCount },
                { 
                    where: { id: promoCode.id },
                    transaction: dbTransaction 
                }
            );

            console.log('Promo code usage count updated:', {
                code: promoCode.code,
                old_count: promoCode.used_count,
                new_count: updatedCount
            });

        } catch (error) {
            console.error('Error recording promo code usage:', error);
            throw error;
        }
    }


    async handlePaymentFailed(paymentIntent) {
        console.log('Payment failed:', paymentIntent.id);
        
        try {
            const transaction = await Transaction.findOne({ 
                where: { payment_id: paymentIntent.id } 
            });

            if (transaction && transaction.status === "Pending") {
                await transaction.update({
                    status: "Failed",
                    stripe_status: paymentIntent.status
                });
                
      
            
                
                console.log('Transaction marked as Failed:', transaction.id);
            }
        } catch (error) {
            console.error('Error handling payment failed:', error);
        }
    }

    async getPaymentIntentStatus(paymentIntentId) {
        try {
            const paymentIntent = await this.stripeTest.paymentIntents.retrieve(paymentIntentId);
            console.log('Payment intent status:', paymentIntent.status);
            return paymentIntent.status;
        } catch (error) {
            console.error('Error retrieving payment intent:', error);
            return '';
        }
    }


    async processTransaction(transaction, dbTransaction = null) {
        try {
            console.log('Processing transaction:', transaction.id);
            
   
            await transaction.update({
                status: "Paid",
                stripe_status: 'succeeded',
                output: this.server
            }, { transaction: dbTransaction });

            console.log('Transaction updated to Paid:', transaction.id);

        
            if (this.server == 2) {
                console.log('Server is 2 - Sending to Sataragan');
                await this.processSataragan(transaction, dbTransaction);
            } else {
                console.log('Server is not 2, skipping Sataragan');
            }

    
            if (transaction.output == 1) {
                console.log('Sending notification for internal order:', transaction.id);
                await this.sendNotification(transaction);
            }

            console.log('Transaction processing completed:', transaction.id);

        } catch (error) {
            console.error('Error processing transaction:', error);

            await transaction.update({ 
                status: "Failed",
                output: 1 
            }, { transaction: dbTransaction });
        }
    }

    async processSataragan(transaction, dbTransaction = null) {
    try {
        const response = await this.sendToSataragan(transaction);
        
        console.log('Sataragan response analysis:', {
            response: response,
            status: response.status,
            dataStatus: response.data?.status
        });
        const isSuccess = response.status === '1' || 
                         response.status === 'Success' || 
                         (response.data && (response.data.status === 'Success' || response.data.status === '1'));

        if (!isSuccess) {
            console.log('Sataragan failed, set to internal processing');
            await transaction.update({ output: 1 }, { transaction: dbTransaction });
        } else {
            const responseData = response.data || response;
            
            console.log('Creating ApiSataragan record with data:', responseData);

         
            await ApiSataragan.create({
                status: responseData.status,
                txn_id: responseData.txn_id,
                amount: responseData.amount,
                customer_mobile: responseData.customer_mobile,
                commission: responseData.commission,
                message: responseData.message,
                api_txn_id: responseData.api_txn_id,
                date: new Date(),
                request_id: responseData.request_id,
                transaction_id: transaction.id
            }, { transaction: dbTransaction });

            console.log('ApiSataragan record created');

       
            console.log('Creating SetaraganTopup record...');
            await this.createSetaraganTopupRecord(transaction, responseData, dbTransaction);

  
            console.log('Updating Sataragan balance...');
            await this.updateSataraganBalance(responseData, transaction, dbTransaction);

            console.log('Setaragan topup record and balance updated');
        }
    } catch (sataraganError) {
        console.error('Error in processSataragan:', sataraganError);
        await transaction.update({ output: 1 }, { transaction: dbTransaction });
        throw sataraganError; 
    }
}

async createSetaraganTopupRecord(transaction, responseData, dbTransaction = null) {
    try {
        console.log('Starting createSetaraganTopupRecord for transaction:', transaction.id);
        console.log('Response data received:', JSON.stringify(responseData, null, 2));
        
        let previousBalance = 0;
        const currentBalance = parseFloat(responseData.current_balance) || 0;
        const amount = parseFloat(responseData.amount) || 0;
        

        previousBalance = currentBalance + amount;
        
        console.log('Calculated previous balance:', {
            currentBalance,
            amount,
            calculatedPrevious: previousBalance
        });


        const setaraganTopup = await SetaraganTopup.create({
            transaction_id: transaction.id,
            customer_mobile: responseData.customer_mobile,
            uid: transaction.uid,
            amount: amount,
            txn_id: responseData.txn_id,
            status: responseData.status,
            current_balance: currentBalance,
            previous_balance: previousBalance, 
            request_id: responseData.request_id,
            commission: parseFloat(responseData.commission) || 0,
            message: responseData.message,
            api_txn_id: responseData.api_txn_id,
            operator_id: this.getPhoneNumberCategory(transaction.phone_number),
            msisdn: '730302030',
            response_data: responseData
        }, { transaction: dbTransaction });

        console.log('SetaraganTopup record created with balances:', {
            id: setaraganTopup.id,
            transaction_id: transaction.id,
            amount: amount,
            previous_balance: previousBalance,
            current_balance: currentBalance,
            txn_id: responseData.txn_id
        });

        return setaraganTopup;
    } catch (error) {
        console.error('Error creating SetaraganTopup record:', error);
        throw error;
    }
}
async updateSataraganBalance(responseData, transaction, dbTransaction = null) {
    try {
        console.log('Starting balance update with response data:', responseData);
        
        const currentBalance = parseFloat(responseData.current_balance) || 0;
        const amount = parseFloat(responseData.amount) || 0;
        

        const previousBalance = currentBalance + amount;
        
        console.log('Balance calculation:', {
            currentBalance,
            amount,
            previousBalance,
            calculated: previousBalance - amount 
        });


        const newBalanceRecord = await SataraganBalance.create({
            current_balance: currentBalance,
            previous_balance: previousBalance, 
            transaction_id: transaction.id,
            topup_id: responseData.txn_id,
            amount: amount,
            type: 'debit',
            notes: `Topup for ${responseData.customer_mobile} - ${responseData.message || 'Success'}`
        }, { transaction: dbTransaction });
        
        console.log('New Sataragan balance record created:', {
            id: newBalanceRecord.id,
            previous_balance: newBalanceRecord.previous_balance,
            current_balance: newBalanceRecord.current_balance,
            amount: newBalanceRecord.amount,
            transaction_id: newBalanceRecord.transaction_id
        });
        
        return newBalanceRecord;
    } catch (error) {
        console.error('❌ Error updating Sataragan balance:', error);
        throw error;
    }
}

    async markPaid(request) {
        const { transaction_id, server, source, payment_id } = request.body;

        console.log('Manual mark paid called:', {
            transaction_id, server, source, payment_id
        });

        if (server !== undefined && server !== null && server !== '') {
            this.server = parseInt(server);
        }

        const transaction = await Transaction.findByPk(transaction_id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

   
        if (transaction.status === "Paid" || transaction.status === "Confirmed") {
            console.log('Transaction already paid, returning:', transaction.status);
            return { transaction };
        }

    
        await this.processTransaction(transaction);

        const updatedTransaction = await Transaction.findByPk(transaction_id);
        return { transaction: updatedTransaction };
    }

    async sendNotification(transaction) {
        try {
            console.log('Notification would be sent for transaction:', transaction.id);
        } catch (error) {
            console.error('Notification error:', error);
        }
    }
}