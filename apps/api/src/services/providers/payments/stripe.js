// services/providers/payments/stripe.js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

async function getIntent(provider_ref) {
    const pi = await stripe.paymentIntents.retrieve(provider_ref);
    return {
        id: pi.id,
        customer: typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? null,
        payment_method: typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id ?? null,
        status: pi.status
    };
}

export const stripeProvider = {
    name: "stripe",

    // Create a PI; supports manual capture + optional test-mode confirmation

    async getOrCreateCustomer({ email, user_id } = {}) {
        if (!email) return null;
        // Cheap lookup by email (fine for test); for prod you might store customer id on your User.
        const list = await stripe.customers.list({ email, limit: 1 });
        const found = list.data[0];
        if (found) return found.id;
        const created = await stripe.customers.create({
            email,
            metadata: user_id ? { user_id } : undefined,
        });
        return created.id;
    },

    async createIntent({
        order,
        amount_minor_usd,               // string|number, USD minor
        metadata = {},
        capture_method = "manual",      // 'manual' | 'automatic'
        payment_method = null,          // e.g. "pm_card_visa" for Postman tests
        confirm = false,
        customer = null,
        receipt_email = null,
        setup_future_usage = null,
    }) {
        const intent = await stripe.paymentIntents.create({
            amount: Number(amount_minor_usd), // minor amount in cents
            currency: "usd",
            capture_method,               // <- key line
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
            // automatic_payment_methods: payment_method ? undefined : { enabled: true },
            customer: customer || undefined,            // <- attach customer
            receipt_email: receipt_email || undefined,
            payment_method: payment_method || undefined,
            confirm: confirm || undefined,
            setup_future_usage: setup_future_usage || undefined,
            metadata: { order_id: order.id, ...metadata }
        });
        return {
            provider: "stripe",
            provider_ref: intent.id,
            client_secret: intent.client_secret,
            amount_minor: intent.amount,
            currency: intent.currency.toUpperCase(),
            status: intent.status
        };
    },
    getIntent,

    async captureIntent(provider_ref) {
        const captured = await stripe.paymentIntents.capture(provider_ref);
        return { provider_ref: captured.id, status: captured.status };
    },

    async cancelIntent(provider_ref) {
        const cancelled = await stripe.paymentIntents.cancel(provider_ref);
        return { provider_ref: cancelled.id, status: cancelled.status };
    },

    async getIntent(id) {
        const pi = await stripe.paymentIntents.retrieve(id);
        return pi;
    },

    verifyWebhook(req) {
        const sig = req.headers["stripe-signature"];
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        try {
            const event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
            switch (event.type) {
                case "payment_intent.succeeded":
                    return { ok: true, event: { type: "payment.succeeded", data: { provider_ref: event.data.object.id } } };
                case "payment_intent.payment_failed":
                    return { ok: true, event: { type: "payment.failed", data: { provider_ref: event.data.object.id, error_message: event.data.object.last_payment_error?.message } } };
                case "payment_intent.canceled":
                    return { ok: true, event: { type: "payment.cancelled", data: { provider_ref: event.data.object.id } } };
                default:
                    return { ok: true, event: { type: "ignored", data: { provider_ref: event.data.object?.id } } };
            }
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
};
