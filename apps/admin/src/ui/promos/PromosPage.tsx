import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { PromoCodeDTO, PromoListResponse, CurrencyDTO } from "./types";
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

export default function PromosPage() {
    const qc = useQueryClient();
    const [q, setQ] = useState("");
    const [active, setActive] = useState<"all" | "true" | "false">("all");
    const [from, setFrom] = useState(""); // yyyy-mm-dd
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<PromoListResponse>({
        queryKey: ["promos", { q, active, from, to, page }],
        queryFn: async () => {
            const params: any = { page, limit: 20 };
            if (q) params.q = q;
            if (active !== "all") params.active = active;
            if (from) params.from = from;
            if (to) params.to = to;
            return (await api.get("/admin/promos", { params })).data as PromoListResponse;
        },
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));


    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<PromoCodeDTO | null>(null);

    return (
        <div className="space-y-6">
          
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Promo Codes</h3>
                    <p className="text-sm text-muted-foreground">Create and manage discount codes.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditing(null); setOpen(true); }}>New promo</Button>
                    </DialogTrigger>
                    {open && (
                        <PromoEditor
                            initial={editing ?? undefined}
                            onClose={() => setOpen(false)}
                            onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["promos"] }); }}
                        />
                    )}
                </Dialog>
            </div>

            {/* toolbar */}
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
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>

        
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Window</TableHead>
                            <TableHead>Limits</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No promos</TableCell></TableRow>
                        )}
                        {rows.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.code}</TableCell>
                                <TableCell className="text-muted-foreground">{p.type}</TableCell>
                                <TableCell>
                                    {p.type === "percent" ? `${p.value}%` : `${p.value} ${p.currency ?? ""}`}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {p.start_at ? new Date(p.start_at).toLocaleDateString() : "—"} → {p.end_at ? new Date(p.end_at).toLocaleDateString() : "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    total {p.max_uses ?? "∞"} / per-user {p.max_uses_per_user ?? "∞"}
                                </TableCell>
                                <TableCell>{p.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="secondary" onClick={() => { setEditing(p); setOpen(true); }}>Edit</Button>
                                    <DeletePromoButton id={p.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">Page {meta.page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
        </div>
    );
}

function DeletePromoButton({ id }: { id: string }) {
    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => (await api.delete(`/admin/promos/${id}`)).data,
        onSuccess: () => { toast.success("Promo deleted"); qc.invalidateQueries({ queryKey: ["promos"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });
    return (
        <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => { if (confirm("Delete this promo?")) mutate(); }}
        >
            Delete
        </Button>
    );
}

function PromoEditor({
    initial, onClose, onSaved,
}: {
    initial?: PromoCodeDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;

    const [code, setCode] = useState(initial?.code ?? "");
    const [type, setType] = useState<"percent" | "fixed">(initial?.type ?? "percent");
    const [value, setValue] = useState(String(initial?.value ?? ""));
    const [currency, setCurrency] = useState<string | "none">(initial?.currency ?? "none");
    const [startAt, setStartAt] = useState(initial?.start_at?.slice(0, 10) ?? "");
    const [endAt, setEndAt] = useState(initial?.end_at?.slice(0, 10) ?? "");
    const [maxUses, setMaxUses] = useState<string>(initial?.max_uses?.toString() ?? "");
    const [maxPerUser, setMaxPerUser] = useState<string>(initial?.max_uses_per_user?.toString() ?? "");
    const [minOrderMinor, setMinOrderMinor] = useState<string>(initial?.min_order_amount_minor?.toString() ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [active, setActive] = useState<boolean>(initial?.active ?? true);

    const { data: curRes } = useQuery<{ data: CurrencyDTO[] }>({
        queryKey: ["currencies"],
        queryFn: async () => (await api.get("/admin/currencies")).data,
        staleTime: 120_000,
    });
    const currencies = curRes?.data ?? [];

    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload: any = {
                code: code.trim() || undefined,
                type,
                value: value === "" ? undefined : Number(value),
                currency: type === "fixed" ? (currency === "none" ? undefined : currency) : null,
                start_at: startAt ? new Date(startAt).toISOString() : null,
                end_at: endAt ? new Date(endAt).toISOString() : null,
                max_uses: maxUses === "" ? null : Number(maxUses),
                max_uses_per_user: maxPerUser === "" ? null : Number(maxPerUser),
                min_order_amount_minor: minOrderMinor === "" ? null : Number(minOrderMinor),
                description: desc || null,
                active,
            };
            if (isEdit) return (await api.patch(`/admin/promos/${initial!.id}`, payload)).data;
            return (await api.post(`/admin/promos`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Promo updated" : "Promo created"); qc.invalidateQueries({ queryKey: ["promos"] }); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    const fixedNeedsCurrency = type === "fixed";

    return (
        <DialogContent className="sm:max-w-[640px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit promo" : "New promo"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <Label>Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>

                <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v: "percent" | "fixed") => setType(v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percent">Percent</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Value</Label>
                    <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <Label>Currency {fixedNeedsCurrency ? "(required)" : "(ignored)"}</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                        <SelectTrigger><SelectValue placeholder="Pick currency" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {currencies.map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
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
                    <Label>Min order amount (minor)</Label>
                    <Input type="number" value={minOrderMinor} onChange={(e) => setMinOrderMinor(e.target.value)} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <Label>Description</Label>
                    <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <Label className="font-medium">Active</Label>
                        <div className="text-xs text-muted-foreground">Enable or disable promo</div>
                    </div>
                    <Switch checked={active} onCheckedChange={setActive} />
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button variant="secondary" onClick={onClose} type="button">
                    Cancel
                </Button>
                <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                        // lightweight validation
                        if (!code.trim()) {
                            toast.error("Code is required");
                            return;
                        }
                        if (type === "fixed" && (currency === "none" || !currency)) {
                            toast.error("Fixed promos require currency");
                            return;
                        }
                        if (value === "" || Number.isNaN(Number(value))) {
                            toast.error("Enter a numeric value");
                            return;
                        }
                        mutate();
                    }}
                >
                    {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save" : "Create")}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
