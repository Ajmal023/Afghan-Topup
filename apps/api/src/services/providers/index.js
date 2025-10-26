import { stripeProvider } from "./payments/stripe.js";
import { awccTopupProvider } from "./topups/awcc.js";
import { hesabPayTopupProvider } from "./topups/hesabPay.js";
import { setaraganTopupProvider } from "./topups/setaragan.js";


export const Payments = {
    stripe: stripeProvider,
};

export const Topups = {
    awcc: awccTopupProvider,
    hesabpay: hesabPayTopupProvider, 
    setaragan: setaraganTopupProvider,
};