import { Router } from "express";
import { StripeService } from "../services/stripeService.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";

const stripeRouter = Router();
const stripeService = new StripeService();

stripeRouter.post("/payment-intent2", requireApiKey, async (req, res) => {
    try {
        console.log('🔐 Payment intent request received');
        const result = await stripeService.paymentIntent2(req);
        res.json(result);
    } catch (error) {
        console.error('❌ Error creating payment intent:', error);
        res.status(500).json({ 
            data: 'error',
            error: error.message 
        });
    }
});

stripeRouter.post("/payment-intent2_new", requireApiKey, async (req, res) => {
    try {
        console.log('🔐 New payment intent request received');
        const result = await stripeService.paymentIntent2(req);
        res.json(result);
    } catch (error) {
        console.error('❌ Error creating new payment intent:', error);
        res.status(500).json({ 
            data: 'error',
            error: error.message 
        });
    }
});


stripeRouter.post("/payment-mark-paid", requireApiKey, async (req, res) => {
    try {
        console.log('🏷️ Mark paid request received');
        const result = await stripeService.markPaid(req);
        res.json({ data: result.transaction });
    } catch (error) {
        console.error('❌ Error marking payment as paid:', error);
        if (error.message.includes("Payment id not found") || 
            error.message.includes("Payment not paid")) {
            return res.status(402).json({ data: error.message });
        }
        res.status(500).json({ data: `Error ${error.message}` });
    }
});

stripeRouter.post("/payment-mark-paid_new", requireApiKey, async (req, res) => {
    try {
        console.log('🏷️ New mark paid request received');
        const result = await stripeService.markPaid(req);
        res.json({ data: result.transaction });
    } catch (error) {
        console.error('❌ Error marking new payment as paid:', error);
        if (error.message.includes("Payment id not found") || 
            error.message.includes("Payment not paid")) {
            return res.status(402).json({ data: error.message });
        }
        res.status(500).json({ data: `Error ${error.message}` });
    }
});

export { stripeRouter };