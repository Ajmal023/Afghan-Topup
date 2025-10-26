// src/ui/products/ProductTypesPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ProductTypeDTO } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

export default function ProductTypesPage() {
    const qc = useQueryClient();
    const { data } = useQuery<{ data: ProductTypeDTO[] }>({
        queryKey: ["product-types"],
        queryFn: async () => (await api.get("/admin/product-types")).data,
        staleTime: 60_000,
    });
    const rows = data?.data ?? [];

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const create = useMutation({
        mutationFn: async () => (await api.post("/admin/product-types", { code, name, description: description || undefined })).data,
        onSuccess: () => {
            toast.success("Type created");
            setCode(""); setName(""); setDescription("");
            qc.invalidateQueries({ queryKey: ["product-types"] });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Failed"),
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>New product type</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                    <Input placeholder="code (e.g. mobile_topup)" value={code} onChange={(e) => setCode(e.target.value)} />
                    <Input placeholder="name (e.g. Mobile Top-up)" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Button onClick={() => create.mutate()} disabled={!code || !name || create.isPending}>
                        {create.isPending ? "Saving…" : "Add"}
                    </Button>
                </CardContent>
            </Card>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!rows.length && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No types</TableCell></TableRow>}
                        {rows.map((r) => <TypeRow key={r.id} row={r} />)}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function TypeRow({ row }: { row: ProductTypeDTO }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState(row.code);
    const [name, setName] = useState(row.name);
    const [description, setDescription] = useState(row.description ?? "");

    const save = useMutation({
        mutationFn: async () => (await api.patch(`/admin/product-types/${row.id}`, {
            code, name, description: description || null
        })).data,
        onSuccess: () => { toast.success("Type updated"); qc.invalidateQueries({ queryKey: ["product-types"] }); setOpen(false); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Update failed"),
    });

    const del = useMutation({
        mutationFn: async () => (await api.delete(`/admin/product-types/${row.id}`)).data,
        onSuccess: () => { toast.success("Type deleted"); qc.invalidateQueries({ queryKey: ["product-types"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });

    return (
        <TableRow>
            <TableCell className="font-mono">{row.code}</TableCell>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-muted-foreground">{row.description ?? "—"}</TableCell>
            <TableCell className="text-right space-x-2">
                <Button variant="secondary" size="icon" onClick={() => setOpen(true)} title="Edit"><Pencil size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this product type?")) del.mutate(); }} title="Delete"><Trash2 size={16} /></Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader><DialogTitle>Edit product type</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <Input placeholder="code" value={code} onChange={(e) => setCode(e.target.value)} />
                            <Input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
                            <Input placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={() => save.mutate()} disabled={save.isPending || !code || !name}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </TableCell>
        </TableRow>
    );
}
