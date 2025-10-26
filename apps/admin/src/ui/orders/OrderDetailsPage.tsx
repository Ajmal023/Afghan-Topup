// src/ui/orders/OrderDetailsPage.tsx
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { OrderStatus } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { OrderStatusBadge } from "./OrdersPage";

type PaymentDTO = {
    id: string;
    provider: string;
    amount_minor: number | string;
    currency: string;
    status: string;
    provider_ref: string;
    error_message: string | null;
    createdAt: string;
};
type TopupLogDTO = {
    id: string;
    status: string;
    provider: string;
    operator_id: string | null;
    operator: { id: string; code: string; name: string } | null;
    msisdn_masked: string | null;
    provider_txn_id: string | null;
    error_code: string | null;
    error_message: string | null;
    createdAt: string;
};
type EnrichedItemDTO = {
    id: string;
    quantity: number;
    currency: string;
    unit_price_minor: number | string;
    display_usd_minor: number | string | null;
    fx_rate_to_usd_snapshot: number | null;
    msisdn_masked: string | null;
    operator: { id: string; code: string; name: string } | null;
    variant: { id: string; name: string; code: string | null } | null;
    topup_logs: TopupLogDTO[];
    topup_status: string;
    amount_minor: number | string;
};
type EnrichedOrderDTO = {
    id: string;
    status: OrderStatus;
    order_no: string | null;
    createdAt: string;
    updatedAt: string;
    user_id: string | null;
    user_email: string | null;
    currency: string;
    total_minor: number | string;
    email: string | null;
    phone: string | null;
    items: EnrichedItemDTO[];
    payments: PaymentDTO[];
    amount_minor: number | string;
    summary: {
        payment_status: string;
        topup_status: string;
        can_refund: boolean;
        amounts: { order_minor: number; order_currency: string };
        contact: { email: string | null; phone: string | null };
    };
    timeline: { at: string; type: string; label: string }[];
};

const transitions: Record<OrderStatus, OrderStatus[]> = {
    created: ["paid", "cancelled"],
    paid: ["fulfilled", "refunded"],
    fulfilled: ["refunded"],
    cancelled: [],
    refunded: [],
};

function currencyDecimals(code: string) {
    return { USD: 2, AFN: 2 }[code.toUpperCase()] ?? 2;
}
function formatMoney(minor: number | string, code: string) {
    const dec = currencyDecimals(code);
    const v = Number(minor) / Math.pow(10, dec);
    if (!isFinite(v)) return String(minor);
    return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function formatMinor(n: number | string) {
    const v = Number(n);
    return isFinite(v) ? v.toLocaleString() : String(n);
}

export default function OrderDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const qc = useQueryClient();

    const { data, isLoading } = useQuery<{ data: EnrichedOrderDTO }>({
        queryKey: ["order", id, "full"],
        queryFn: async () => (await api.get(`/admin/orders/${id}?full=1`)).data,
    });
    const order = data?.data;

    const setStatus = useMutation({
        mutationFn: async (nextStatus: OrderStatus) =>
            (await api.patch(`/admin/orders/${id}/status`, { status: nextStatus })).data,
        onSuccess: () => {
            toast.success("Status updated");
            qc.invalidateQueries({ queryKey: ["order", id, "full"] });
            qc.invalidateQueries({ queryKey: ["orders"] });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Update failed"),
    });

    const cancelOrder = useMutation({
        mutationFn: async () => (await api.patch(`/admin/orders/${id}/cancel`)).data,
        onSuccess: () => {
            toast.success("Order cancelled");
            qc.invalidateQueries({ queryKey: ["order", id, "full"] });
            qc.invalidateQueries({ queryKey: ["orders"] });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Cancel failed"),
    });

    if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
    if (!order) return <div className="text-sm text-muted-foreground">Not found</div>;

    const nexts = transitions[order.status] ?? [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Order {order.order_no || order.id}</h3>
                    <div className="mt-1 flex items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        <Badge variant="outline">{order.summary.payment_status}</Badge>
                        <Badge variant="outline">{order.summary.topup_status}</Badge>
                        <span className="text-sm text-muted-foreground">
                            Total: {formatMinor(order.total_minor)} {order.currency}
                        </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                        User:  {order.user_email ? `${order.user_email}` : ""} •{" "}
                        Created: {new Date(order.createdAt).toLocaleString()}
                    </div>
                    {(order.summary.contact.email || order.summary.contact.phone) && (
                        <div className="text-sm text-muted-foreground">
                            Email: {order.summary.contact.email ?? "—"} • Phone: {order.summary.contact.phone ?? "—"}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {order.status !== "cancelled" && order.status !== "refunded" && order.status !== "fulfilled" && (
                        <Button variant="secondary" onClick={() => cancelOrder.mutate()} disabled={cancelOrder.isPending}>
                            {cancelOrder.isPending ? "Cancelling…" : "Cancel"}
                        </Button>
                    )}
                    {nexts.map((s) => (
                        <Button key={s} onClick={() => setStatus.mutate(s)} disabled={setStatus.isPending}>
                            {setStatus.isPending ? "Saving…" : `Mark ${s}`}
                        </Button>
                    ))}
                </div>
            </header>

            {/* Items */}
            <section className="rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 text-sm text-muted-foreground">Items</div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product / Variant</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>AFN</TableHead>
                            <TableHead>USD</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(order.items ?? []).map((it) => (
                            <TableRow key={it.id}>
                                <TableCell className="font-medium">{it.variant?.name ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {it.operator ? `${it.operator.name} (${it.operator.code})` : "—"}
                                </TableCell>
                                <TableCell className="tabular-nums">{formatMinor(it.unit_price_minor)}</TableCell>
                                <TableCell className="tabular-nums">{it.display_usd_minor != null ? formatMinor(it.display_usd_minor) : "—"}</TableCell>
                            </TableRow>
                        ))}
                        {!order.items?.length && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-sm text-muted-foreground">No items</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </section>

            {/* Payments */}
            <section className="rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Payments</div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead>Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(order.payments ?? []).map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>{p.provider.toUpperCase()}</TableCell>
                                <TableCell><Badge variant={p.status === "succeeded" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                                <TableCell className="tabular-nums">{formatMoney(p.amount_minor, p.currency)} {p.currency}</TableCell>
                                <TableCell className="font-mono">{p.provider_ref}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                        {!order.payments?.length && (
                            <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No payments</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </section>

            {/* Top-ups (per item) */}
            <section className="rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 text-sm text-muted-foreground">Top-up Logs</div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>MSISDN</TableHead>
                            <TableHead>Txn ID</TableHead>
                            <TableHead>Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(order.items ?? []).flatMap((it) =>
                            it.topup_logs.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell>
                                        <Badge variant={l.status === "delivered" || l.status === "accepted" ? "default" : "secondary"}>
                                            {l.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{l.provider ?? "—"}</TableCell>
                                    <TableCell>{l.msisdn_masked ?? "—"}</TableCell>
                                    <TableCell className="font-mono">{l.provider_txn_id ?? "—"}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</TableCell>
                                </TableRow>
                            ))
                        )}
                        {!order.items?.length || !order.items[0]?.topup_logs?.length ? (
                            <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No top-up logs</TableCell></TableRow>
                        ) : null}
                    </TableBody>
                </Table>
            </section>

            {/* Timeline */}
            <section className="rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 text-sm text-muted-foreground">Timeline</div>
                <div className="p-4 space-y-2 text-sm">
                    {order.timeline.map((ev, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-muted-foreground w-44">{new Date(ev.at).toLocaleString()}</span>
                            <Badge variant="outline">{ev.type}</Badge>
                            <span>{ev.label}</span>
                        </div>
                    ))}
                    {!order.timeline.length && <div className="text-muted-foreground">No events</div>}
                </div>
            </section>
        </div>
    );
}
