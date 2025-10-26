import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

type OperatorLite = { id: string; code: string; name: string } | null;

type LastLog = {
    id: string;
    status: string;
    error_code: string | null;
    error_message: string | null;
    createdAt: string;
} | null;

type PendingJob = {
    job_id: string;
    state: "delayed" | "waiting" | "active" | string;
    next_run_at: string | null;
    order_id: string | null;
    order_status: string | null;
    order_item_id: string | null;
    msisdn: string | null;
    operator: OperatorLite;
    next_try: number;
    tries_total: number;
    tries_remaining_including_next: number;
    payment_intent: { provider: string; ref: string } | null;
    last_log: LastLog;
};

type DetailResp = {
    data: {
        job_id: string;
        state: string;
        next_run_at: string | null;
        order_id: string | null;
        order_status: string | null;
        order_item_id: string | null;
        msisdn: string | null;
        operator: OperatorLite;
        next_try: number;
        tries_total: number;
        tries_remaining_including_next: number;
        payment_intent: { provider: string; ref: string } | null;
        last_log: LastLog;
        raw: {
            data: any;
            opts: any;
            timestamp: number;
            delay: number;
            attemptsMade: number;
        };
    };
};

function JobStateBadge({ state }: { state: string }) {
    const s = state.toLowerCase();
    if (s === "active") return <Badge>Active</Badge>;
    if (s === "delayed") return <Badge variant="outline">Scheduled</Badge>;
    if (s === "waiting") return <Badge variant="secondary">Waiting</Badge>;
    return <Badge variant="secondary">{state}</Badge>;
}

function formatDT(v: string | null) {
    if (!v) return "—";
    try { return new Date(v).toLocaleString(); } catch { return v; }
}

export default function TopupQueuePage() {
    const [orderId, setOrderId] = useState("");
    const [itemId, setItemId] = useState("");
    const [limit, setLimit] = useState("200");
    const [refreshKey, setRefreshKey] = useState(0);

    const q = useQuery({
        queryKey: ["topups", "pending", { orderId, itemId, limit, refreshKey }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (orderId) params.set("order_id", orderId);
            if (itemId) params.set("item_id", itemId);
            if (limit) params.set("limit", limit);
            const { data } = await api.get(`/admin/topups/pending?${params.toString()}`);
            return data as { data: PendingJob[] };
        },
    });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="rounded-2xl border p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Order ID</div>
                        <Input
                            placeholder="order uuid…"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Order Item ID</div>
                        <Input
                            placeholder="order item uuid…"
                            value={itemId}
                            onChange={(e) => setItemId(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Limit</div>
                        <Input
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            min={1}
                            max={500}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button onClick={() => setRefreshKey((k) => k + 1)} disabled={q.isLoading}>
                            {q.isLoading ? "Loading…" : "Refresh"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 text-sm text-muted-foreground">
                    Pending Top-ups {q.data?.data ? `(${q.data.data.length})` : ""}
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>State</TableHead>
                            <TableHead>Next run</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>MSISDN</TableHead>
                            <TableHead>Try</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>Last log</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(q.data?.data ?? []).map((j) => (
                            <TableRow key={j.job_id}>
                                <TableCell><JobStateBadge state={j.state} /></TableCell>
                                <TableCell className="text-muted-foreground">{formatDT(j.next_run_at)}</TableCell>
                                <TableCell className="font-mono">
                                    {j.order_id ? <Link className="underline" to={`/orders/${j.order_id}`}>{j.order_id.slice(0, 8)}…</Link> : "—"}
                                </TableCell>
                                <TableCell className="font-mono">{j.order_item_id ? `${j.order_item_id.slice(0, 8)}…` : "—"}</TableCell>
                                <TableCell>{j.operator ? `${j.operator.name} (${j.operator.code})` : "—"}</TableCell>
                                <TableCell>{j.msisdn ?? "—"}</TableCell>
                                <TableCell className="tabular-nums">{j.next_try}/{j.tries_total}</TableCell>
                                <TableCell className="tabular-nums">{j.tries_remaining_including_next}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {j.last_log
                                        ? `${j.last_log.status}${j.last_log.error_message ? ` · ${j.last_log.error_message.slice(0, 40)}…` : ""}`
                                        : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DetailsDialogTrigger jobId={j.job_id} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {!q.data?.data?.length && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-sm text-muted-foreground">
                                    No pending jobs
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function DetailsDialogTrigger({ jobId }: { jobId: string }) {
    const [open, setOpen] = useState(false);
    const q = useQuery<DetailResp>({
        queryKey: ["topups", "pending", "detail", jobId, open],
        enabled: open,
        queryFn: async () => (await api.get(`/admin/topups/pending/${jobId}`)).data,
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">View</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>Job {jobId}</DialogTitle>
                </DialogHeader>
                {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
                {q.data && (
                    <div className="space-y-4 text-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <KV label="State" value={q.data.data.state} />
                            <KV label="Next run" value={formatDT(q.data.data.next_run_at)} />
                            <KV label="Order ID" value={q.data.data.order_id ?? "—"} mono link={q.data.data.order_id ? `/orders/${q.data.data.order_id}` : undefined} />
                            <KV label="Order status" value={q.data.data.order_status ?? "—"} />
                            <KV label="Item ID" value={q.data.data.order_item_id ?? "—"} mono />
                            <KV label="MSISDN" value={q.data.data.msisdn ?? "—"} />
                            <KV label="Operator" value={q.data.data.operator ? `${q.data.data.operator.name} (${q.data.data.operator.code})` : "—"} />
                            <KV label="Try" value={`${q.data.data.next_try}/${q.data.data.tries_total}`} />
                            <KV label="Remaining" value={`${q.data.data.tries_remaining_including_next}`} />
                            <KV label="Payment intent" value={
                                q.data.data.payment_intent
                                    ? `${q.data.data.payment_intent.provider} · ${q.data.data.payment_intent.ref}`
                                    : "—"
                            } />
                        </div>

                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Last log</div>
                            {q.data.data.last_log ? (
                                <div className="rounded-lg border p-3">
                                    <div>Status: <Badge variant="outline">{q.data.data.last_log.status}</Badge></div>
                                    <div className="text-muted-foreground">
                                        {q.data.data.last_log.error_message || q.data.data.last_log.error_code || "—"}
                                    </div>
                                    <div className="text-muted-foreground">{formatDT(q.data.data.last_log.createdAt)}</div>
                                </div>
                            ) : <div className="text-muted-foreground">—</div>}
                        </div>

                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Raw</div>
                            <pre className="rounded-lg border p-3 overflow-auto text-xs">
                                {JSON.stringify(q.data.data.raw, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function KV({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
    const content = mono ? <span className="font-mono">{value}</span> : <span>{value}</span>;
    return (
        <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            {link ? <Link to={link} className="underline">{content}</Link> : content}
        </div>
    );
}
