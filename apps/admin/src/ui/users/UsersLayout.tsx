// src/ui/users/UsersLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
    { to: "/users/internal", label: "Internal users" },
    { to: "/users/customers", label: "Customers" },
];

export default function UsersLayout() {
    return (
        <div className="space-y-6">
            <div className="flex gap-2 overflow-auto rounded-xl border p-1">
                {tabs.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        className={({ isActive }) =>
                            cn(
                                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive && "bg-accent text-accent-foreground"
                            )
                        }
                    >
                        {t.label}
                    </NavLink>
                ))}
            </div>
            <Outlet />
        </div>
    );
}
