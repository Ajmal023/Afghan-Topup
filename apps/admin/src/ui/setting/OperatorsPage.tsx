// src/ui/catalog/OperatorsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { OperatorDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function OperatorsPage() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<{ data: OperatorDTO[] }, Error, { data: OperatorDTO[] }>({
        queryKey: ["operators"],
        queryFn: async () => (await api.get("/admin/operators")).data,
        placeholderData: (prev) => prev,
    });

    const rows = data?.data ?? [];

    // dialog state
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<OperatorDTO | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Operators</h3>
                    <p className="text-sm text-muted-foreground">Mobile operators/providers.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditing(null); setOpen(true); }}>New operator</Button>
                    </DialogTrigger>
                    {open && (
                        <OperatorEditor
                            initial={editing ?? undefined}
                            onClose={() => setOpen(false)}
                            onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["operators"] }); }}
                        />
                    )}
                </Dialog>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No operators</TableCell></TableRow>
                        )}
                        {rows.map((op) => (
                            <TableRow key={op.id}>
                                <TableCell className="font-mono">{op.code}</TableCell>
                                <TableCell className="font-medium">{op.name}</TableCell>
                                <TableCell>{op.country}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setEditing(op); setOpen(true); }}>
                                        Edit
                                    </Button>
                                    <DeleteOperatorButton id={op.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function DeleteOperatorButton({ id }: { id: string }) {
    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => (await api.delete(`/admin/operators/${id}`)).data,
        onSuccess: () => { toast.success("Operator deleted"); qc.invalidateQueries({ queryKey: ["operators"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });
    return (
        <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => { if (confirm("Delete operator?")) mutate(); }}
        >
            Delete
        </Button>
    );
}

function OperatorEditor({
    initial, onClose, onSaved,
}: {
    initial?: OperatorDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;
    const [code, setCode] = useState(initial?.code ?? "");
    const [name, setName] = useState(initial?.name ?? "");
    const [country, setCountry] = useState(initial?.country ?? "AF");

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload = { code, name, country };
            if (isEdit) return (await api.patch(`/admin/operators/${initial!.id}`, payload)).data;
            return (await api.post(`/admin/operators`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Operator updated" : "Operator created"); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    return (
        <DialogContent className="sm:max-w-[520px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit operator" : "New operator"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} /></div>
            </div>
            <DialogFooter className="mt-4">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !code || !name}>
                    {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save" : "Create")}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
