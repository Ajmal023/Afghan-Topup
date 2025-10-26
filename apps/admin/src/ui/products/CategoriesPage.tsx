// src/ui/products/CategoriesPage.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { CategoryDTO } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
    const qc = useQueryClient();
    const listQ = useQuery<{ data: (CategoryDTO & { parent_name?: string | null })[] }>({
        queryKey: ["categories"],
        queryFn: async () => (await api.get("/admin/categories")).data,
        staleTime: 60_000,
    });
    const rows = listQ.data?.data ?? [];

    // New category form
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [parentId, setParentId] = useState<string | null>(null);

    const create = useMutation({
        mutationFn: async () => (await api.post("/admin/categories", {
            name,
            slug: slug || undefined,
            parent_id: parentId ?? undefined,
        })).data,
        onSuccess: () => {
            toast.success("Category created");
            setName(""); setSlug(""); setParentId("");
            qc.invalidateQueries({ queryKey: ["categories"] });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Create failed"),
    });

    // Build parent options (cannot select itself in edit dialog)
    const parents = rows;

    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-4">
                <Input placeholder="Name" value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} />
                <Input placeholder="Slug (optional)" value={slug} onChange={e => setSlug(slugify(e.target.value))} />
                <Select
                    value={parentId ?? "none"}
                    onValueChange={(v) => setParentId(v === "none" ? null : v)}
                >
                    <SelectTrigger><SelectValue placeholder="Parent (optional)" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parents.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
                    {create.isPending ? "Saving…" : "Add"}
                </Button>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No categories</TableCell></TableRow>}
                        {rows.map(c => <CategoryRow key={c.id} row={c} all={rows} />)}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function CategoryRow({ row, all }: { row: CategoryDTO & { parent_name?: string | null }, all: CategoryDTO[] }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);

    const del = useMutation({
        mutationFn: async () => (await api.delete(`/admin/categories/${row.id}`)).data,
        onSuccess: () => { toast.success("Category deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });

    return (
        <TableRow>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="font-mono">{row.slug || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{row.parent_name || "—"}</TableCell>
            <TableCell className="text-right space-x-2">
                <Button variant="secondary" size="icon" onClick={() => setOpen(true)} title="Edit"><Pencil size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this category?")) del.mutate(); }} title="Delete"><Trash2 size={16} /></Button>

                <EditCategoryDialog open={open} onOpenChange={setOpen} row={row} all={all} />
            </TableCell>
        </TableRow>
    );
}

function EditCategoryDialog({ open, onOpenChange, row, all }: {
    open: boolean; onOpenChange: (v: boolean) => void;
    row: CategoryDTO; all: CategoryDTO[];
}) {
    const qc = useQueryClient();
    const [name, setName] = useState(row.name);
    const [slug, setSlug] = useState(row.slug ?? "");
    const [parentId, setParentId] = useState<string | null>(row.parent_id ?? null);

    const save = useMutation({
        mutationFn: async () => (await api.patch(`/admin/categories/${row.id}`, {
            name,
            slug: slug || undefined,
            parent_id: parentId
        })).data,
        onSuccess: () => { toast.success("Category updated"); qc.invalidateQueries({ queryKey: ["categories"] }); onOpenChange(false); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Update failed"),
    });

    const parentOptions = useMemo(
        () => all.filter(c => c.id !== row.id), // cannot set itself as parent
        [all, row.id]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Name" value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} />
                    <Input placeholder="Slug (optional)" value={slug} onChange={e => setSlug(slugify(e.target.value))} />
                    <Select
                        value={parentId ?? "none"}
                        onValueChange={(v) => setParentId(v === "none" ? null : v)}
                    >
                        <SelectTrigger><SelectValue placeholder="Parent (optional)" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {parentOptions.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
