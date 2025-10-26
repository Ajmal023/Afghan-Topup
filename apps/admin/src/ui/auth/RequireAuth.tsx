import { Navigate, useLocation } from "react-router-dom";
import { useMe } from "./useMe";

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const loc = useLocation();
    const { data, isLoading, isError } = useMe();

    if (isLoading) return <div className="p-6 text-sm opacity-70">Checking session…</div>;
    if (isError) return <Navigate to="/login" state={{ from: loc }} replace />;
    if (data?.role !== "admin") return <div className="p-6">Not authorized.</div>;

    return <>{children}</>;
}
