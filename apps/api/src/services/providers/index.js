import { stripeProvider } from "./payments/stripe.js";
import { awccTopupProvider } from "./topups/awcc.js";

export const Payments = {
    stripe: stripeProvider,
    // paypal: paypalProvider, etc
};

export const Topups = {
    awcc: awccTopupProvider,
    // etisalat: etisalatProvider, etc
};
