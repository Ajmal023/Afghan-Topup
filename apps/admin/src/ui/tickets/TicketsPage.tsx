import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TicketDTO, TicketListResponse, TicketPriority, TicketStatus } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const statusOptions: TicketStatus[] = ["open", "pending", "closed"];
const priorityOptions: TicketPriority[] = ["low", "normal", "high"];

export default function TicketsPage() {
    const nav = useNavigate();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<"" | TicketStatus>("");
    const [priority, setPriority] = useState<"" | TicketPriority>("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<TicketListResponse>({
        queryKey: ["tickets", { q, status, priority, page }],
        queryFn: async () => {
            const params: Record<string, any> = { page, limit: 20 };
            if (q) params.q = q;
            if (status) params.status = status;
            if (priority) params.priority = priority;
            return (await api.get("/admin/tickets", { params })).data as TicketListResponse;
        },
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    const statusUI = status || "all";
    const priorityUI = priority || "all";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Tickets</h3>
                <p className="text-sm text-muted-foreground">Support tickets created by customers and staff.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1">
                    <Input
                        placeholder="Search by subject…"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex gap-2">
                    <Select
                        value={statusUI}
                        onValueChange={(v: string) => { setStatus(v === "all" ? "" : (v as TicketStatus)); setPage(1); }}
                    >
                        <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select
                        value={priorityUI}
                        onValueChange={(v: string) => { setPriority(v === "all" ? "" : (v as TicketPriority)); setPage(1); }}
                    >
                        <SelectTrigger className="w-40"><SelectValue placeholder="All priorities" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All priorities</SelectItem>
                            {priorityOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No tickets</TableCell></TableRow>
                        )}
                        {rows.map((t: TicketDTO) => (
                            <TableRow
                                key={t.id}
                                className="cursor-pointer hover:bg-accent/40"
                                onClick={() => nav(`/tickets/${t.id}`)}
                            >
                                <TableCell className="font-medium">{t.subject}</TableCell>
                                <TableCell><StatusBadge status={t.status} /></TableCell>
                                <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                                <TableCell className="text-muted-foreground">{t.assignee_user_id ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); nav(`/tickets/${t.id}`); }}>
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">Page {meta.page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: TicketStatus }) {
    const label = status[0].toUpperCase() + status.slice(1);
    const variant = status === "open" ? "default" : status === "pending" ? "secondary" : "outline";
    return <Badge variant={variant as any}>{label}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
    const label = priority[0].toUpperCase() + priority.slice(1);
    const variant = priority === "high" ? "destructive" : priority === "normal" ? "default" : "secondary";
    return <Badge variant={variant as any}>{label}</Badge>;
}
