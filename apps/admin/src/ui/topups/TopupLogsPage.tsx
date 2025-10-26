import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TopupLogListItem, TopupLogListResponse, OperatorLite } from "./types";

const statusOptions = ["sent", "accepted", "delivered", "failed"] as const;

export default function TopupLogsPage() {
    const nav = useNavigate();

    const [provider, setProvider] = useState("");
    const [status, setStatus] = useState<"all" | typeof statusOptions[number]>("all");
    const [operatorId, setOperatorId] = useState<"all" | string>("all");
    const [msisdn, setMsisdn] = useState("");
    const [from, setFrom] = useState(""); // yyyy-mm-dd
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);

    // Operators for filter
    const { data: opsRes } = useQuery<{ data: OperatorLite[] }>({
        queryKey: ["operators"],
        queryFn: async () => (await api.get("/admin/operators")).data,
        staleTime: 60_000,
    });
    const operators = opsRes?.data ?? [];

    const { data, isLoading } = useQuery<TopupLogListResponse>({
        queryKey: ["topup-logs", { provider, status, operatorId, msisdn, from, to, page }],
        queryFn: async () => {
            const params: Record<string, any> = { page, limit: 20 };
            if (provider) params.provider = provider;
            if (status !== "all") params.status = status;
            if (operatorId !== "all") params.operator = operatorId;
            if (msisdn) params.msisdn = msisdn;
            if (from) params.from = from;
            if (to) params.to = to;
            return (await api.get("/admin/topup-logs", { params })).data as TopupLogListResponse;
        },
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Top-up Logs</h3>
                <p className="text-sm text-muted-foreground">Provider callbacks and operator results.</p>
            </div>

            {/* Toolbar */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Input placeholder="Provider (e.g. AWCC)" value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} />
                <Select value={status} onValueChange={(v: string) => { setStatus(v as any); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select
                    value={operatorId}
                    onValueChange={(v: string) => { setOperatorId(v as any); setPage(1); }}
                >
                    <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All operators</SelectItem>
                        {operators.map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input placeholder="MSISDN contains…" value={msisdn} onChange={(e) => { setMsisdn(e.target.value); setPage(1); }} />
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>MSISDN</TableHead>
                            <TableHead>Txn</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No logs</TableCell></TableRow>
                        )}
                        {rows.map((r: TopupLogListItem) => (
                            <TableRow
                                key={r.id}
                                className="cursor-pointer hover:bg-accent/40"
                                onClick={() => nav(`/orders/topup-logs/${r.id}`)}
                            >
                                <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                                <TableCell className="font-medium">{r.provider}</TableCell>
                                <TableCell>
                                    {r.status === "failed"
                                        ? <Badge variant="destructive">Failed</Badge>
                                        : r.status === "delivered"
                                            ? <Badge>Delivered</Badge>
                                            : <Badge variant="secondary">{r.status}</Badge>
                                    }
                                </TableCell>
                                <TableCell className="font-mono text-xs">{r.operator_id.slice(0, 8)}</TableCell>
                                <TableCell className="text-muted-foreground">{r.msisdn ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{r.provider_txn_id ?? "—"}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); nav(`/topups/logs/${r.id}`); }}>
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
