// src/ui/payments/PaymentIntentsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { PaymentIntentDTO, PaymentIntentListResponse, PaymentIntentStatus } from "../orders/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statuses: PaymentIntentStatus[] = ["created", "pending", "succeeded", "failed", "cancelled"];

function currencyDecimals(code: string) {
    return { USD: 2, AFN: 2 }[code.toUpperCase()] ?? 2;
}
function formatMoney(minor: number | string, code: string) {
    const dec = currencyDecimals(code);
    const v = Number(minor) / Math.pow(10, dec);
    if (!isFinite(v)) return String(minor);
    return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function PaymentIntentsPage() {
    const qc = useQueryClient();

    const [status, setStatus] = useState<"" | PaymentIntentStatus>("");
    const [provider, setProvider] = useState("");
    const [userId, setUserId] = useState("");

    const { data, isLoading } = useQuery<PaymentIntentListResponse>({
        queryKey: ["payment-intents", { status, provider, userId }],
        queryFn: async () => {
            const all = (await api.get("/admin/payment-intents")).data as PaymentIntentListResponse;
            // Filter client-side because the API doesn’t expose filters yet
            const rows = (all.data ?? []).filter((p) => {
                if (status && p.status !== status) return false;
                if (provider && p.provider !== provider) return false;
                if (userId && p.user_id !== userId) return false;
                return true;
            });
            return { data: rows };
        },
    });

    const cancel = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/admin/payment-intents/${id}/cancel`)).data,
        onSuccess: () => { toast.success("Intent cancelled"); qc.invalidateQueries({ queryKey: ["payment-intents"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Cancel failed"),
    });

    const rows = data?.data ?? [];
    const statusUIValue = status || "all";
    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-lg font-semibold">Payment Intents</h3>
                <p className="text-sm text-muted-foreground">Track and manage payment attempts.</p>
            </header>

            {/* Filters */}
            <div className="grid gap-3 md:grid-cols-[180px_180px_1fr]">
                <Select
                    value={statusUIValue}
                    onValueChange={(v) => setStatus(v === "all" ? "" : (v as PaymentIntentStatus))}
                >
                    <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>                <Input placeholder="Provider (e.g. stripe)" value={provider} onChange={(e) => setProvider(e.target.value)} />
                <Input placeholder="Filter by user id (admin)" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Intent</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount (minor)</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
                        {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">No intents</TableCell></TableRow>}
                        {rows.map((p: PaymentIntentDTO) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.id.slice(0, 8)}…</TableCell>
                                <TableCell className="text-muted-foreground">{p.order_id ?? "—"}</TableCell>
                                <TableCell>{p.provider}</TableCell>
                                <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                                <TableCell className="tabular-nums">{formatMoney(p.amount_minor, p.currency)} {p.currency}</TableCell>
                                <TableCell className="text-muted-foreground">{p.user_id ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    {(p.status === "created" || p.status === "pending") && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={cancel.isPending}
                                            onClick={() => cancel.mutate(p.id)}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function PaymentStatusBadge({ status }: { status: PaymentIntentStatus }) {
    const variant =
        status === "succeeded" ? undefined :
            status === "failed" ? "destructive" :
                status === "cancelled" ? "outline" :
                    "secondary";
    return <Badge variant={variant as any}>{status}</Badge>;
}
