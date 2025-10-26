import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { analyticsRouter } from "./analytics.js";
import { usersRouter } from "./users.js";
import { sessionsRouter } from "./sessions.js";
import { currenciesRouter } from "./currencies.js";
import { productTypesRouter } from "./productTypes.js";
import { operatorsRouter } from "./operators.js";
import { productsRouter } from "./products.js";
import { variantsRouter } from "./variants.js";
import { ordersRouter } from "./orders.js";
import { paymentIntentsRouter } from "./paymentIntents.js";
import { referralsRouter } from "./referrals.js";
import { setaraganTopupsRouter } from "./setaraganTopups.js";
import { ticketsRouter } from "./tickets.js";
import { categoriesRouter } from "./categories.js";
import { adminDashRouter } from "./adminDashboards.js";
import { checkoutRouter } from "./checkout.js";
import { contactsRouter } from "./contacts.js";
import { adminTopupsRouter } from "./adminTopups.js";
import { topupLogsRouter } from "./topupLogs.js";
import { incentivesRouter } from "./incentives.js";
import { publicCatalogRouter } from "./publicCatalog.js";
import { customersRouter } from "./customers.js";
import { recurringTopupsRouter } from "./recurringTopups.js";
import { stripeRouter } from './stripe.js';
import { promoRouter } from './promoCodeRoutes.js';
import { transactionsRouter } from './transactions.js';
import { packagesRouter } from './packages.js';
import { settingsRouter } from './settings.js';
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { adminCustomersRouter } from "./adminCustomers.js";

const router = Router();
router.use("/health", healthRouter);
router.use("/auth", authRouter);    

const publicRouter = Router();

publicRouter.use("/catalog", publicCatalogRouter);
router.use("/public", publicRouter);
router.use('/promo', promoRouter);
router.use('/packages', packagesRouter)
router.use("/currencies", currenciesRouter)
router.use('/api/products', productsRouter);
router.use('/', stripeRouter);
router.use("/customer/", customersRouter); 
router.use('/transactions', transactionsRouter);
router.use("/api", analyticsRouter);
router.use('/api/packages', packagesRouter);
router.use('/api/settings', settingsRouter);
router.use("/checkout", checkoutRouter);
router.use("/", recurringTopupsRouter);


const customerRouter = Router();
customerRouter.use("/orders", ordersRouter);
customerRouter.use("/payment-intents", paymentIntentsRouter);
customerRouter.use("/tickets", ticketsRouter);
customerRouter.use("/contacts", contactsRouter);
customerRouter.use("/sessions", sessionsRouter);
customerRouter.use("/incentives", incentivesRouter);
router.use("/customer", requireAuth, customerRouter);
router.use("/tickets", ticketsRouter);
const adminOnly = [requireAuth, requireRole("admin")];
const adminRouter = Router();
adminRouter.use("/", adminDashRouter);
adminRouter.use("/trans", requireAuth, requireRole("admin"), transactionsRouter);
adminRouter.use("/product-types", productTypesRouter);
adminRouter.use("/operators", operatorsRouter);
adminRouter.use("/products", productsRouter);
adminRouter.use("/setaragan-topups", requireAuth, requireRole("admin"), setaraganTopupsRouter);
adminRouter.use("/variants", variantsRouter);
adminRouter.use("/orders", ordersRouter);
adminRouter.use("/categories", categoriesRouter);
adminRouter.use("/topup-logs", topupLogsRouter);
adminRouter.use("/tickets", ticketsRouter);
adminRouter.use("/users", usersRouter);
adminRouter.use("/topups", adminTopupsRouter);
adminRouter.use("/sessions", sessionsRouter);
adminRouter.use("/referrals", referralsRouter);
adminRouter.use("/customers", adminCustomersRouter);
router.use("/admin", adminOnly, adminRouter);

export default router;