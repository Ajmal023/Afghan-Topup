import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

type Row = {
    id: string;
    user_id: string;
    product_variant_id: string;
    msisdn: string;
    Operator?: { id: string; code: string; name: string } | null;
    is_custom_amount: boolean;
    amount_afn_minor: number | null;
    amount_usd_minor: number | null;
    frequency: string;
    next_run_at: string;
    scheduled_date: string | null;
    active: boolean;
    times_run: number;
    last_run_at: string | null;
    last_error: string | null;
    createdAt: string;
};

function fmt(v: number | null | undefined, currency = "AFN") {
    if (v == null) return "—";
    return `${Number(v).toLocaleString()} ${currency}`;
}
function dt(s: string | null) {
    return s ? new Date(s).toLocaleString() : "—";
}

export default function RecurringTopupsPage() {
    const [msisdn, setMsisdn] = useState("");
    const [user, setUser] = useState("");

    const qc = useQueryClient();
    const q = useQuery({
        queryKey: ["recurring-topups", { msisdn, user }],
        queryFn: async () => {
            const p = new URLSearchParams();
            if (msisdn) p.set("msisdn", msisdn);
            if (user) p.set("user", user);
            const { data } = await api.get(`/admin/recurring-topups?${p.toString()}`);
            return data as { data: Row[] };
        }
    });

    const toggle = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
            (await api.patch(`/admin/recurring-topups/${id}`, { active })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring-topups"] }),
    });

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border p-4 grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">MSISDN</div>
                    <Input value={msisdn} onChange={(e) => setMsisdn(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">User ID</div>
                    <Input value={user} onChange={(e) => setUser(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                    <Button onClick={() => q.refetch()} disabled={q.isLoading}>
                        {q.isLoading ? "Loading…" : "Search"}
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 text-sm text-muted-foreground">Recurring Top-ups</div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Active</TableHead>
                            <TableHead>Next run</TableHead>
                            <TableHead>MSISDN</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Freq</TableHead>
                            <TableHead>Runs</TableHead>
                            <TableHead>Last run</TableHead>
                            <TableHead>Last error</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(q.data?.data ?? []).map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={r.active}
                                            onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })}
                                        />
                                        <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Paused"}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{dt(r.next_run_at)}</TableCell>
                                <TableCell>{r.msisdn}</TableCell>
                                <TableCell>{r.Operator ? `${r.Operator.name} (${r.Operator.code})` : "—"}</TableCell>
                                <TableCell>
                                    {r.is_custom_amount
                                        ? `${fmt(r.amount_usd_minor, "USD")} · ${fmt(r.amount_afn_minor, "AFN")}`
                                        : fmt(r.amount_afn_minor, "AFN")}
                                </TableCell>
                                <TableCell>{r.frequency}</TableCell>
                                <TableCell className="tabular-nums">{r.times_run}</TableCell>
                                <TableCell className="text-muted-foreground">{dt(r.last_run_at)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {r.last_error ? r.last_error.slice(0, 60) : "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!q.data?.data?.length && (
                            <TableRow><TableCell colSpan={9} className="text-sm text-muted-foreground">No schedules</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
