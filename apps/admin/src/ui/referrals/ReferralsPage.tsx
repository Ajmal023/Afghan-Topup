import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ReferralCodeDTO, ReferralListResponse, UserLite } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function ReferralsPage() {
    const qc = useQueryClient();
    const [q, setQ] = useState("");
    const [active, setActive] = useState<"all" | "true" | "false">("all");
    const [owner, setOwner] = useState<"all" | string>("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);

    // staff list for owner filter (admins + sales)
    const { data: staffRes } = useQuery<{ id: string; email: string | null; role: string }[]>({
        queryKey: ["users", "staff"],
        queryFn: async () => {
            const [admins, sales] = await Promise.all([
                api.get("/admin/users", { params: { role: "admin", limit: 200 } }),
                api.get("/admin/users", { params: { role: "sales", limit: 200 } }),
            ]);
            return [...admins.data.data, ...sales.data.data].map((u: any) => ({ id: u.id, email: u.email, role: u.role })) as UserLite[];
        },
        staleTime: 120_000,
    });
    const staff = staffRes ?? [];

    const { data, isLoading } = useQuery<ReferralListResponse>({
        queryKey: ["referrals", { q, active, owner, from, to, page }],
        queryFn: async () => {
            const params: any = { page, limit: 20 };
            if (q) params.q = q;
            if (active !== "all") params.active = active;
            if (owner !== "all") params.owner = owner;
            if (from) params.from = from;
            if (to) params.to = to;
            return (await api.get("/admin/referrals", { params })).data as ReferralListResponse;
        },
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ReferralCodeDTO | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Referral Codes</h3>
                    <p className="text-sm text-muted-foreground">Create and track referral codes.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditing(null); setOpen(true); }}>New referral</Button>
                    </DialogTrigger>
                    {open && (
                        <ReferralEditor
                            initial={editing ?? undefined}
                            staff={staff}
                            onClose={() => setOpen(false)}
                            onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["referrals"] }); }}
                        />
                    )}
                </Dialog>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Input placeholder="Search code…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                <Select value={active} onValueChange={(v: "all" | "true" | "false") => { setActive(v); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={owner} onValueChange={(v) => { setOwner(v as any); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All owners</SelectItem>
                        {staff.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.email ?? u.id} ({u.role})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Window</TableHead>
                            <TableHead>Max uses</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No referrals</TableCell></TableRow>
                        )}
                        {rows.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="font-medium">{r.code}</TableCell>
                                <TableCell className="font-mono text-xs">{r.owner_user_id ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {(r.start_at || r.expires_at || r.end_at)
                                        ? `${r.start_at ? new Date(r.start_at).toLocaleDateString() : "—"} → ${r.end_at ? new Date(r.end_at).toLocaleDateString() : (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—")}`
                                        : "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{r.max_uses ?? "∞"}</TableCell>
                                <TableCell>{r.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="secondary" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
                                    {/* No delete UI for referrals by default—add if you expose an endpoint */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">Page {meta.page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
        </div>
    );
}

function ReferralEditor({
    initial, staff, onClose, onSaved,
}: {
    initial?: ReferralCodeDTO;
    staff: UserLite[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;

    const [code, setCode] = useState(initial?.code ?? "");
    const [ownerId, setOwnerId] = useState<string | "none">(initial?.owner_user_id ?? "none");
    const [active, setActive] = useState<boolean>(initial?.active ?? true);
    const [maxUses, setMaxUses] = useState<string>(initial?.max_uses?.toString() ?? "");
    const [maxPerUser, setMaxPerUser] = useState<string>((initial?.max_uses_per_user ?? "") as any);
    const [startAt, setStartAt] = useState(initial?.start_at?.slice(0, 10) ?? "");
    const [endAt, setEndAt] = useState((initial?.end_at ?? initial?.expires_at ?? "").slice(0, 10));
    const [notes, setNotes] = useState(initial?.notes ?? "");

    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload: any = {
                code: code.trim() || undefined,
                owner_user_id: ownerId === "none" ? null : ownerId,
                active,
                max_uses: maxUses === "" ? null : Number(maxUses),
                max_uses_per_user: maxPerUser === "" ? null : Number(maxPerUser),
                start_at: startAt ? new Date(startAt).toISOString() : null,
                end_at: endAt ? new Date(endAt).toISOString() : null,
                notes: notes || null,
            };
            if (isEdit) return (await api.patch(`/admin/referrals/${initial!.id}`, payload)).data;
            return (await api.post(`/admin/referrals`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Referral updated" : "Referral created"); qc.invalidateQueries({ queryKey: ["referrals"] }); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    return (
        <DialogContent className="sm:max-w-[640px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit referral" : "New referral"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <Label>Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <Label>Owner (optional)</Label>
                    <Select value={ownerId} onValueChange={(v) => setOwnerId(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Pick owner" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No owner</SelectItem>
                            {staff.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.email ?? u.id} ({u.role})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>End date</Label>
                    <Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <Label>Max uses (total)</Label>
                    <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Max uses per user</Label>
                    <Input type="number" value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value)} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <Label className="font-medium">Active</Label>
                        <div className="text-xs text-muted-foreground">Enable or disable code</div>
                    </div>
                    <Switch checked={active} onCheckedChange={setActive} />
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !code.trim()}>
                    {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save" : "Create")}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
