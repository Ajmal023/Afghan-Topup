// src/ui/catalog/CatalogLayout.tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
    { to: "/catalog/products", label: "Products" },
    { to: "/catalog/types", label: "Product Types" },
    { to: "/catalog/categories", label: "Categories" },
    { to: "/catalog/operators", label: "Operators" },
    { to: "/catalog/currencies", label: "Currencies" },
];

export default function CatalogLayout() {
    const { pathname } = useLocation();
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Catalog</h2>
                <div className="flex gap-1">
                    {tabs.map((t) => {
                        const active = pathname === t.to || (t.to.endsWith("/products") && pathname === "/catalog");
                        return (
                            <NavLink
                                key={t.to}
                                to={t.to}
                                className={({ isActive }) =>
                                    cn(
                                        "rounded-full border px-3 py-1.5 text-sm",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        (isActive || active) && "bg-accent text-accent-foreground"
                                    )
                                }
                            >
                                {t.label}
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            <Outlet />
        </div>
    );
}
