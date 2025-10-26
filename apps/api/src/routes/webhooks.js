import { Router } from "express";
import { PaymentIntent, Order, OrderItem, ProductVariant } from "../models/index.js";
import { stripeProvider } from "../services/providers/payments/stripe.js";
import { audit } from "../services/audit.js";
import { enqueueTopupsForOrder } from "../services/orders/fulfillment.js";

export const webhooksRouter = Router();

webhooksRouter.post("/stripe", async (req, res, next) => {
    try {
        const out = stripeProvider.verifyWebhook(req);
        if (!out.ok) return res.status(400).send(out.error);
        const event = out.event;
        const ref = event.data?.provider_ref;
        if (!ref) return res.status(200).end();

        const intent = await PaymentIntent.findOne({ where: { provider_ref: ref } });
        if (!intent) return res.status(200).end();
        const order = await Order.findByPk(intent.order_id);

        if (event.type === "payment.succeeded") {
            if (intent.status !== "succeeded") {
                intent.status = "succeeded";
                await intent.save();
                if (order.status === "created") {
                    order.status = "paid";
                    await order.save();
                    await audit(null, "order.paid", "order", order.id);

                    // enqueue fulfillment (top-ups)
                    await enqueueTopupsForOrder(order.id);
                }
            }
        } else if (event.type === "payment.failed") {
            intent.status = "failed";
            intent.error_message = event.data?.error_message || "Payment failed";
            await intent.save();
        } else if (event.type === "payment.cancelled") {
            intent.status = "cancelled";
            await intent.save();
        }
        res.status(200).end();
    } catch (e) { next(e); }
});
