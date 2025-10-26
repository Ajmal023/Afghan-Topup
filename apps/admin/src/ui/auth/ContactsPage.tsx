// src/ui/contacts/ContactsPage.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ContactDTO, OperatorDTO } from "../catalog/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

// client-side quick check, aligns with backend (broad)
function isValidMsisdn(s: string) {
    return /^(\+?\d{9,15})$/.test(s.trim());
}

export default function ContactsPage() {
    const qc = useQueryClient();
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);

    const { data: opsRes } = useQuery<{ data: OperatorDTO[] }, Error, { data: OperatorDTO[] }>({
        queryKey: ["operators"],
        queryFn: async () => (await api.get("/admin/operators")).data,
        staleTime: 60_000,
        placeholderData: (p) => p,
    });
    const operators = opsRes?.data ?? [];

    const { data, isLoading } = useQuery<{
        data: ContactDTO[];
        meta: { page: number; limit: number; count: number };
    }, Error, { data: ContactDTO[]; meta: { page: number; limit: number; count: number } }>({
        queryKey: ["contacts", { q, page }],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, limit: 20 };
            if (q) params.q = q;
            return (await api.get("/contacts", { params })).data;
        },
        placeholderData: (prev) => prev,
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ContactDTO | null>(null);

    const opMap = useMemo(
        () => Object.fromEntries(operators.map((o) => [o.id, o.name])),
        [operators]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Contacts</h3>
                    <p className="text-sm text-muted-foreground">Saved recipients (MSISDNs).</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditing(null); setOpen(true); }}>
                            New contact
                        </Button>
                    </DialogTrigger>
                    {open && (
                        <ContactEditor
                            initial={editing ?? undefined}
                            operators={operators}
                            onClose={() => setOpen(false)}
                            onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["contacts"] }); }}
                        />
                    )}
                </Dialog>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <Input
                    placeholder="Search name or MSISDN…"
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                />
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>MSISDN</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No contacts</TableCell></TableRow>
                        )}
                        {rows.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="font-mono">{c.msisdn}</TableCell>
                                <TableCell>{c.Operator?.name ?? (c.operator_id ? opMap[c.operator_id] : "—")}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => { setEditing(c); setOpen(true); }}
                                    >
                                        Edit
                                    </Button>
                                    <DeleteContactButton id={c.id} />
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

function DeleteContactButton({ id }: { id: string }) {
    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => (await api.delete(`/contacts/${id}`)).data,
        onSuccess: () => { toast.success("Contact deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });
    return (
        <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => { if (confirm("Delete this contact?")) mutate(); }}
        >
            Delete
        </Button>
    );
}

function ContactEditor({
    initial, operators, onClose, onSaved,
}: {
    initial?: ContactDTO;
    operators: OperatorDTO[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;
    const [name, setName] = useState(initial?.name ?? "");
    const [msisdn, setMsisdn] = useState(initial?.msisdn ?? "");
    const [operatorId, setOperatorId] = useState<string>(initial?.operator_id ?? "");
    const [notes, setNotes] = useState(initial?.notes ?? "");

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload: any = { name, msisdn, notes: notes || undefined, operator_id: operatorId || null };
            if (isEdit) return (await api.patch(`/contacts/${initial!.id}`, payload)).data;
            return (await api.post(`/contacts`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Contact updated" : "Contact created"); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    const msisdnOk = isValidMsisdn(msisdn);

    return (
        <DialogContent className="sm:max-w-[520px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit contact" : "New contact"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2">
                    <Label>MSISDN</Label>
                    <Input value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="+93xxxxxxxxx or 0xxxxxxxxx" />
                    {!msisdnOk && msisdn.length > 0 && (
                        <div className="text-xs text-destructive">Invalid format</div>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Operator (optional)</Label>
                    <Select value={operatorId || "none"} onValueChange={(v) => setOperatorId(v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {operators.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2"><Label>Notes (optional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter className="mt-4">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !name || !msisdnOk}>
                    {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save" : "Create")}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
