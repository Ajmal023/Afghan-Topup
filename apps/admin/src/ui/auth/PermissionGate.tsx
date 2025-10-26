import React from "react";
import { useMe } from "./useMe";

export function PermissionGate({
    needs,
    children,
}: {
    needs: string | string[];
    children: React.ReactNode;
}) {
    const { data } = useMe();
    if (!data) return null;

    if (data.role === "admin") return <>{children}</>; // full access for now

    const required = Array.isArray(needs) ? needs : [needs];
    const perms = Array.isArray(data.permissions) ? data.permissions : [];
    const ok = required.every((p) => perms.includes(p));

    return ok ? <>{children}</> : null;
}
