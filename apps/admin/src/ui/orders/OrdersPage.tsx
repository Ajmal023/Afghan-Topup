// src/ui/orders/OrdersPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import type { OrderListResponse, OrderStatus } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusOptions: OrderStatus[] = ["created", "paid", "fulfilled", "cancelled", "refunded"];

export default function OrdersPage() {
    const nav = useNavigate();

    const [status, setStatus] = useState<"" | OrderStatus>("");
    const [userId, setUserId] = useState("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<OrderListResponse>({
        queryKey: ["orders", { status, userId, from, to, page }],
        queryFn: async () => {
            const params: Record<string, any> = { page, limit: 20 };
            if (status) params.status = status;
            if (userId) params.user = userId;
            if (from) params.from = from;
            if (to) params.to = to;
            return (await api.get("/admin/orders", { params })).data as OrderListResponse;
        },
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));
    const statusUIValue = status || "all";

    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-lg font-semibold">Orders</h3>
                <p className="text-sm text-muted-foreground">Review and manage orders.</p>
            </header>

            {/* Filters */}
            <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_1fr]">
                <Select
                    value={statusUIValue}
                    onValueChange={(v) => {
                        setStatus(v === "all" ? "" : (v as OrderStatus));
                        setPage(1);
                    }}
                >
                    <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statusOptions.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>                <Input placeholder="Filter by user id (admin)" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} />
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total (minor)</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No orders found</TableCell></TableRow>
                        )}
                        {rows.map((o) => (
                            <TableRow
                                key={o.id}
                                className="cursor-pointer hover:bg-accent/40"
                                onClick={(e) => {
                                    const tag = (e.target as HTMLElement).closest("button,a");
                                    if (!tag) nav(`/orders/${o.id}`);
                                }}
                            >
                                <TableCell className="font-medium">{o.id.slice(0, 8)}…</TableCell>
                                <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                                <TableCell className="tabular-nums">{Number(o.total_minor).toLocaleString()}</TableCell>
                                <TableCell className="text-muted-foreground">{o.user_id ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="secondary" size="sm" onClick={() => nav(`/orders/${o.id}`)}>
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">Page {meta.page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
        </div>
    );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const v =
        status === "created" ? "secondary" :
            status === "paid" ? undefined :
                status === "fulfilled" ? undefined :
                    status === "refunded" ? "outline" :
                        "destructive";
    return <Badge variant={v as any}>{status}</Badge>;
}
