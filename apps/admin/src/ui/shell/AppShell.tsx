import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
    LayoutDashboard,
    LogOut,
    Users as UsersIcon,
    LifeBuoy,
    Settings as SettingsIcon,
    PercentSquare,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string };
type NavGroup =
    | { type: "link"; label: string; icon: any; to: string; exact?: boolean }
    | { type: "group"; label: string; icon: any; children: NavItem[] };

const NAV: NavGroup[] = [
    { type: "link", label: "Dashboard", icon: LayoutDashboard, to: "/", exact: true },

    // {
    //     type: "group",
    //     label: "Catalog",
    //     icon: Boxes,
    //     children: [
    //         { label: "Products", to: "/products" },
    //         { label: "Product Types", to: "/types" },
    //         { label: "Categories", to: "/categories" },
    //     ],
    // },

    // {
    //     type: "group",
    //     label: "Orders",
    //     icon: ShoppingCart,
    //     children: [
    //         { label: "Orders", to: "/orders" },
    //         { label: "Payment Intents", to: "/orders/payment-intents" },
    //         { label: "Topup Logs", to: "/orders/topup-logs" },
    //         { label: "Pending Topups", to: "/orders/pending-topup" },
    //         { label: "Recurring Topups", to: "/orders/recurring-topup" },

    //     ],
    // },

    {
        type: "link",
        label: "Users",
        icon: UsersIcon,
        to: "/users",
    },
      {
        type: "link",
        label: "Provider",
        icon: UsersIcon,
        to: "/provider",
    },
    {
        type: "link",
        label: "Customers",
        icon: UsersIcon,
        to: "/customers",
    },
    // {
    //         type: "group",
    //     label: "Promotions",
    //     icon: PercentSquare,
    //     children: [
    //         { label: "Promo Codes", to: "/promos" },
    //         { label: "Promo Uses", to: "/promos/uses" },
    //         { label: "Referrals", to: "/referrals" },
    //         { label: "Referral Uses", to: "/referrals/uses" },
    //     ],
    // },

        {
        type: "link",
        label: "Packages",
        icon: UsersIcon,
        to: "/packages",
    },
         {
        type: "link",
        label: "Transactions",
        icon: UsersIcon,
        to: "/transactions",
    },
          {
        type: "link",
        label: "Promo Code",
        icon: UsersIcon,
        to: "/promo-codes",
    },
   
              {
        type: "link",
        label: "Setaragan Topups",
        icon: UsersIcon,
        to: "/setaragan-topups",
    },
                {
        type: "link",
        label: "Transaction Check",
        icon: UsersIcon,
        to: "/transaction-check",
    },
    
          {
        type: "link",
        label: "Promo Requests",
        icon: UsersIcon,
        to: "/promo-requests",
    },
          {
        type: "link",
        label: "Promo Uses",
        icon: UsersIcon,
        to: "/promo-uses",
    },
   
    {
        type: "group",
        label: "Promotions",
        icon: PercentSquare,
        children: [
            { label: "Promo Codes", to: "/promos" },
            { label: "Promo Uses", to: "/promos/uses" },
            { label: "Referrals", to: "/referrals" },
            { label: "Referral Uses", to: "/referrals/uses" },
        ],
    },
    {
        type: "link",
        label: "Support",
        icon: LifeBuoy,
        to: "/tickets",
    },

    {
        type: "group",
        label: "Settings",
        icon: SettingsIcon,
        children: [
            { label: "Currencies", to: "/settings/currencies" },
            { label: "Sessions", to: "/settings/sessions" },
            { label: "Operators", to: "/settings/operators" },

        ],
    },
];


function useCurrentTitle(pathname: string) {
    const flat: { to: string; label: string }[] = [];
    for (const g of NAV) {
        if (g.type === "link") {
            flat.push({ to: g.to, label: g.label });
        } else {
            for (const c of g.children) flat.push({ to: c.to, label: c.label });
        }
    }
    let best: { to: string; label: string } | null = null;
    for (const it of flat) {
        if (pathname === it.to || pathname.startsWith(it.to + "/")) {
            if (!best || it.to.length > best.to.length) best = it;
        }
    }
    if (best) return best.label;
    if (pathname === "/") return "Dashboard";
    const seg = pathname.split("/").filter(Boolean)[0] ?? "Dashboard";
    return seg.charAt(0).toUpperCase() + seg.slice(1);
}


function SideNavLink({ to, label }: NavItem) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors",
                    isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                )
            }
        >
            <span className="truncate">{label}</span>
        </NavLink>
    );
}

function SideNavGroup({ label, icon: Icon, children }: { label: string; icon: any; children: NavItem[] }) {
    const { pathname } = useLocation();
    const containsActive = children.some(
        (c) => pathname === c.to || pathname.startsWith(c.to + "/")
    );
    const [open, setOpen] = useState(containsActive);

    useEffect(() => {
        if (containsActive) setOpen(true);
    }, [containsActive]);

    return (
        <div className="select-none">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                    "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-expanded={open}
            >
                <span className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="font-medium">{label}</span>
                </span>
                <ChevronDown
                    size={16}
                    className={cn("transition-transform", open && "rotate-180")}
                    aria-hidden="true"
                />
            </button>

            <div className={cn("mt-1 space-y-1 pl-2", !open && "hidden")}>
                {children.map((c) => (
                    <SideNavLink key={c.to} {...c} />
                ))}
            </div>
        </div>
    );
}

export function AppShell() {
    const routerNav = useNavigate();
    const qc = useQueryClient();
    const { pathname } = useLocation();

    const title = useCurrentTitle(pathname);

    const onLogout = async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            qc.clear();
            toast.success("Logged out");
            routerNav("/login", { replace: true });
        }
    };

    return (
        <div className="min-h-screen w-full grid grid-cols-[280px_1fr]">
            <aside className="sticky top-0 h-screen border-r bg-card flex flex-col">
                <div className="px-5 py-4">
                    <div className="text-lg font-semibold tracking-tight">Tohfa Admin</div>
                </div>

                <nav className={cn(
                    "px-2 pb-3 space-y-1 overflow-y-auto",
                    "text-foreground [&_a]:text-inherit [&_a:hover]:text-accent-foreground [&_a]:no-underline"
                )}>
                    {NAV.map((entry) =>
                        entry.type === "link" ? (
                            <NavLink
                                key={entry.to}
                                to={entry.to}
                                end={entry.exact}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors",
                                        isActive
                                            ? "bg-[#FFC107]/20 font-bold text-[#FFC107]"
                                            : "text-[#FFC107] hover:bg-accent hover:text-accent-foreground"
                                    )
                                }
                                title={entry.label}
                            >
                                <entry.icon size={16} />
                                <span>{entry.label}</span>
                            </NavLink>
                        ) : (
                            <SideNavGroup key={entry.label} label={entry.label} icon={entry.icon} children={entry.children} />
                        )
                    )}
                </nav>

                <div className="mt-auto p-3">
                    <button
                        onClick={onLogout}
                        className={cn(
                            "w-full inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>


            <main className="min-h-screen">
           
                <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="w-full px-6 py-3">
                        <div className="text-base font-semibold">{title}</div>
                    </div>
                </div>

      
                <div className="w-full px-6 py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
