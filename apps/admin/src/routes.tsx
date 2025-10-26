import type { RouteObject } from "react-router-dom";
import { RequireAuth } from "@/ui/auth/RequireAuth";
import { AppShell } from "@/ui/shell/AppShell";
import LoginPage from "@/ui/auth/LoginPage";
import Dashboard from "@/pages/Dashboard";
import SignupPage from "@/ui/auth/SignupPage";
import ProductsPage from "@/ui/products/ProductsPage";
import ProductDetailPage from "@/ui/products/ProductDetailPage";
import ProductTypesPage from "@/ui/products/ProductTypesPage";
import CategoriesPage from "@/ui/products/CategoriesPage";
import OperatorsPage from "@/ui/setting/OperatorsPage";
import CurrenciesPage from "@/ui/setting/CurrenciesPage";
import ContactsPage from "@/ui/contacts/ContactsPage";

import InternalUsersPage from "@/ui/users/InternalUsersPage";
import OrdersPage from "@/ui/orders/OrdersPage";
import OrderDetailsPage from "@/ui/orders/OrderDetailsPage";
import PaymentIntentsPage from "@/ui/orders/PaymentIntentsPage";
import TicketsPage from "@/ui/tickets/TicketsPage";
import TicketDetailPage from "@/ui/tickets/TicketDetailPage";
import SessionsPage from "@/ui/sessions/SessionsPage";
import TopupLogsPage from "@/ui/topups/TopupLogsPage";
import TopupLogDetailPage from "@/ui/topups/TopupLogDetailPage";
import PromosPage from "@/ui/promos/PromosPage";

import ReferralsPage from "@/ui/referrals/ReferralsPage";
import ReferralUsesPage from "@/ui/referrals/ReferralUsesPage";
import TopupQueuePage from "./ui/topups/TopupQueuePage";
import RecurringTopupsPage from "./ui/topups/RecurringTopupsPage";
import PackagesPage from "./ui/packages/PackagesPage";
import EditPackagePage from "./ui/packages/EditPackagePage";
import PromoCodesPage from "./ui/promoCode/PromoCodesPage";
import PromoRequestsPage from "./ui/promoCodeRequest/PromoRequestPage";
import PromoUsagePage from "./ui/promoUsage/PromoCodeUsage";
import EditPromoCodePage from "./ui/promoCode/EditPromoCodePage";
import CustomersPage from "./ui/customers/CustomersPage";
import TransactionsPage from "./ui/transaction/TransactionsPage";
import PromoUsesPage from "./ui/promoUse/PromoUsagePage";
import SetaraganTopupsPage from "./ui/setaraganTopupPage/SetaraganTopupsPage";
import NewTransactionsPage from "./ui/transactionCheck/newTransactionsPage";
import ProviderConfigsPage from "./ui/provider/ProviderPage";


export const routes: RouteObject[] = [
    { path: "/login", element: <LoginPage /> },
    { path: "/signup", element: <SignupPage /> },
    {
        path: "/",
        element: (
            <RequireAuth>
                <AppShell />
            </RequireAuth>
        ),
        children: [{ index: true, element: <Dashboard /> },
        { path: "products", element: <ProductsPage /> },
        { path: "products/:id", element: <ProductDetailPage /> },
        { path: "types", element: <ProductTypesPage /> },
        { path: "categories", element: <CategoriesPage /> },
        { path: "settings/operators", element: <OperatorsPage /> },
        { path: "settings/currencies", element: <CurrenciesPage /> },
        { path: "contacts", element: <ContactsPage /> },
        { path: "users", element: <InternalUsersPage /> },
     
{
    path: "/packages",
    element: <PackagesPage />,
},
{
    path: "/packages/edit/:id",
    element: <EditPackagePage />,
},
        { path: "orders", element: <OrdersPage /> },
        {
  path: "/customers",
  element: <CustomersPage />,
},
{
  path: "/provider",
  element: <ProviderConfigsPage />,
},
      {
  path: "/transactions",
  element: <TransactionsPage />,
},
        { path: "orders/:id", element: <OrderDetailsPage /> },
        { path: "orders/payment-intents", element: <PaymentIntentsPage /> },
        { path: "tickets", element: <TicketsPage /> },
        { path: "tickets/:id", element: <TicketDetailPage /> },
        {
            path: "settings/sessions",
            element: <SessionsPage />,
        },
        {
            path: "/orders/topup-logs",
            element: <TopupLogsPage />,
        },
        {
    path: "/promo-codes",
    element: <PromoCodesPage />
},
        {
    path: "/promo-uses",
    element: <PromoUsesPage />
},
        {
    path: "/setaragan-topups",
    element: <SetaraganTopupsPage />
},
        {
    path: "/transaction-check",
    element: <NewTransactionsPage />
},
{
    path: "/promo-requests",
    element: <PromoRequestsPage />
},
{
    path: "/promo-codes/usage/:id",
    element: <PromoUsagePage />
},
{
    path: "/promo-codes/edit/:id",
    element: <EditPromoCodePage />
},
        {
            path: "/orders/pending-topup",
            element: <TopupQueuePage />,
        },
        { path: "/orders/recurring-topup", element: <RecurringTopupsPage /> },
        {
            path: "/orders/topup-logs/:id",
            element: <TopupLogDetailPage />,
        },
        {
            path: "/promos",
            element: <PromosPage />,
        },
        {
            path: "/promos/uses",
            element: <PromoUsesPage />,
        },
        {
            path: "/referrals",
            element: <ReferralsPage />,
        },
        {
            path: "/referrals/uses",
            element: <ReferralUsesPage />,
        },


        ],
    },
];
