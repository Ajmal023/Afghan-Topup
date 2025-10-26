// src/ui/products/ProductDetailPage.tsx
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ProductDTO, ProductTypeDTO, CategoryDTO, ProductVariantDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useMemo, useState } from "react";

// Minimal operator DTO (use your shared type if you already have one)
type OperatorDTO = {
    id: string;
    code: string;
    name: string;
    country?: string | null;
};

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const qc = useQueryClient();

    const prodQ = useQuery<{ data: ProductDTO }>({
        queryKey: ["product", id],
        queryFn: async () => (await api.get(`/admin/products/${id}`)).data,
    });

    const typesQ = useQuery<{ data: ProductTypeDTO[] }>({
        queryKey: ["product-types"],
        queryFn: async () => (await api.get("/admin/product-types")).data,
        staleTime: 60_000,
    });

    const catsQ = useQuery<{ data: CategoryDTO[] }>({
        queryKey: ["categories"],
        queryFn: async () => (await api.get("/admin/categories")).data,
        staleTime: 60_000,
    });

    // NEW: operators for variant assignment
    const opsQ = useQuery<{ data: OperatorDTO[] }>({
        queryKey: ["operators"],
        queryFn: async () => (await api.get("/admin/operators")).data,
        staleTime: 60_000,
    });

    const p = prodQ.data?.data;
    const allCats = catsQ.data?.data ?? [];
    const types = typesQ.data?.data ?? [];
    const operators = opsQ.data?.data ?? [];

    const toggleActive = useMutation({
        mutationFn: async (next: boolean) => (await api.patch(`/admin/products/${id}`, { is_active: next })).data,
        onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["product", id] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Update failed"),
    });

    if (prodQ.isLoading) return <div className="text-sm text-muted-foreground">Loading product…</div>;
    if (!p) return <div className="text-sm text-muted-foreground">Not found</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <div className="text-sm text-muted-foreground">SKU: {p.sku || "—"}</div>
                    <div className="text-sm text-muted-foreground">Type: {p.ProductType?.name || "—"}</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                        <span className="text-sm">Active</span>
                        <Switch
                            checked={!!p.is_active}
                            onCheckedChange={(v) => toggleActive.mutate(v)}
                            disabled={toggleActive.isPending}
                        />
                    </div>
                    <EditProductDialog product={p} types={types} />
                </div>
            </section>

            {/* Variants */}
            <VariantsPanel productId={p.id} variants={p.ProductVariants ?? []} operators={operators} />

            {/* Categories */}
            <CategoriesPanel productId={p.id} assigned={p.Categories ?? []} all={allCats} />
        </div>
    );
}

/* ---------- Edit product ---------- */
function EditProductDialog({ product, types }: { product: ProductDTO; types: ProductTypeDTO[] }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);

    const [name, setName] = useState(product.name);
    const [sku, setSku] = useState(product.sku ?? "");
    const [productTypeId, setProductTypeId] = useState(product.product_type_id);
    const [description, setDescription] = useState(product.description ?? "");

    const save = useMutation({
        mutationFn: async () =>
            (await api.patch(`/admin/products/${product.id}`, {
                name,
                sku: sku || undefined,
                product_type_id: productTypeId,
                description: description || undefined,
            })).data,
        onSuccess: () => {
            toast.success("Product updated");
            qc.invalidateQueries();
            setOpen(false);
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Update failed"),
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary">Edit</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
                    <div className="space-y-2">
                        <Label>Product type</Label>
                        <Select value={productTypeId} onValueChange={setProductTypeId}>
                            <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                            <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={() => save.mutate()} disabled={save.isPending || !name || !productTypeId}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ---------- Variants panel ---------- */
function VariantsPanel({
    productId,
    variants,
    operators
}: {
    productId: string;
    variants: ProductVariantDTO[];
    operators: OperatorDTO[];
}) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ProductVariantDTO | null>(null);

    const del = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/admin/variants/${id}`)).data,
        onSuccess: () => { toast.success("Variant deleted"); qc.invalidateQueries(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });

    const opMap = useMemo(() => {
        const m = new Map<string, OperatorDTO>();
        operators.forEach(o => m.set(o.id, o));
        return m;
    }, [operators]);

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-medium">Variants</h4>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditing(null); setOpen(true); }}>New variant</Button>
                    </DialogTrigger>
                    {open && (
                        <VariantEditor
                            productId={productId}
                            operators={operators}
                            initial={editing ?? undefined}
                            onClose={() => setOpen(false)}
                            onSaved={() => { setOpen(false); qc.invalidateQueries(); }}
                        />
                    )}
                </Dialog>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>AFN (minor)</TableHead>
                            <TableHead>USD display (minor)</TableHead>
                            <TableHead>Rate snapshot</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants.length === 0 && (
                            <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">No variants</TableCell></TableRow>
                        )}
                        {variants.map(v => {
                            const op = v.operator_id ? opMap.get(v.operator_id) : undefined;
                            return (
                                <TableRow key={v.id}>
                                    <TableCell className="font-medium">
                                        {v.name} {v.is_custom_amount && <Badge variant="outline" className="ml-2">Custom</Badge>}
                                    </TableCell>
                                    <TableCell className="tabular-nums">{v.is_custom_amount ? "—" : v.amount_minor}</TableCell>
                                    <TableCell className="tabular-nums">{v.is_custom_amount ? "Derived at checkout" : (v.display_usd_minor ?? "—")}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {v.display_usd_rate_to_base != null ? `${v.display_usd_rate_to_base}` : "—"}
                                        {v.display_usd_synced_at ? ` · ${new Date(v.display_usd_synced_at).toLocaleString()}` : ""}
                                    </TableCell>
                                    <TableCell className="font-mono">{v.code ?? "—"}</TableCell>
                                    <TableCell>
                                        {op
                                            ? <div className="flex items-center gap-2">
                                                <Badge variant="outline">{op.code}</Badge>
                                                <span className="text-sm text-muted-foreground">{op.name}</span>
                                            </div>
                                            : <span className="text-sm text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>{v.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="secondary" size="sm" onClick={() => { setEditing(v); setOpen(true); }}>Edit</Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => { if (confirm("Delete this variant?")) del.mutate(v.id); }}
                                            disabled={del.isPending}
                                        >Delete</Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}

function VariantEditor({
    productId, operators, initial, onClose, onSaved,
}: {
    productId: string;
    operators: OperatorDTO[];
    initial?: ProductVariantDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;
    const [name, setName] = useState(initial?.name ?? "");
    const [amountMinor, setAmountMinor] = useState<string>(initial?.amount_minor?.toString() ?? "");
    const [currency, setCurrency] = useState(initial?.currency ?? "AFN");
    const [code, setCode] = useState(initial?.code ?? "");
    const [operatorId, setOperatorId] = useState<string>(initial?.operator_id ?? "__none");
    const [active, setActive] = useState<boolean>(initial?.is_active ?? true);
    const [custom, setCustom] = useState<boolean>(initial?.is_custom_amount ?? false);

    // USD display (optional)
    const [usdMinor, setUsdMinor] = useState<string>(initial?.display_usd_minor?.toString() ?? "");
    const [rateSnap, setRateSnap] = useState<string>(initial?.display_usd_rate_to_base?.toString() ?? "");

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload: any = {
                product_id: productId,
                name,
                currency,
                code: code || null,
                operator_id: operatorId === "__none" ? null : operatorId,
                is_active: active,
                is_custom_amount: custom,
                amount_minor: custom ? undefined : (amountMinor === "" ? undefined : Number(amountMinor)),
                display_usd_minor: custom ? undefined : (usdMinor === "" ? null : Number(usdMinor)),
                display_usd_rate_to_base: custom ? undefined : (rateSnap === "" ? null : Number(rateSnap)),
            };
            if (isEdit) return (await api.patch(`/admin/variants/${initial!.id}`, payload)).data;
            return (await api.post(`/admin/variants`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Variant updated" : "Variant created"); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    return (
        <DialogContent className="sm:max-w-[560px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit variant" : "New variant"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                {/* Operator */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Operator</label>
                    <Select value={operatorId} onValueChange={setOperatorId}>
                        <SelectTrigger><SelectValue placeholder="Select operator (optional)" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem key="__none" value="__none">— None —</SelectItem>
                            {operators.map(op => (
                                <SelectItem key={op.id} value={op.id}>
                                    {op.code} — {op.name}{op.country ? ` (${op.country})` : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Custom amount toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <div className="font-medium text-sm">Custom amount (customer enters USD)</div>
                        <div className="text-xs text-muted-foreground">AFN is derived using the current FX at checkout.</div>
                    </div>
                    <Switch checked={custom} onCheckedChange={setCustom} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount (AFN minor)</label>
                        <Input
                            type="number"
                            value={amountMinor}
                            onChange={(e) => setAmountMinor(e.target.value)}
                            disabled={custom}
                            placeholder={custom ? "Custom variant" : undefined}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Currency</label>
                        <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Display USD (minor)</label>
                        <Input
                            type="number"
                            value={usdMinor}
                            onChange={(e) => setUsdMinor(e.target.value)}
                            disabled={custom}
                            placeholder={custom ? "Derived at checkout" : undefined}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Rate snapshot (AFN→USD)</label>
                        <Input type="number" step="0.000001" value={rateSnap} onChange={(e) => setRateSnap(e.target.value)} />
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Code (optional)</label>
                        <Input value={code} onChange={(e) => setCode(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <div className="font-medium text-sm">Active</div>
                            <div className="text-xs text-muted-foreground">Available for purchase</div>
                        </div>
                        <Switch checked={active} onCheckedChange={setActive} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !name || (!custom && amountMinor === "")}>
                    Save
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

/* ---------- Categories panel ---------- */
function CategoriesPanel({ productId, assigned, all }: { productId: string; assigned: CategoryDTO[]; all: CategoryDTO[] }) {
    const qc = useQueryClient();
    const [attachId, setAttachId] = useState<string>("");

    const attach = useMutation({
        mutationFn: async () => (await api.post(`/admin/products/${productId}/categories`, { category_id: attachId })).data,
        onSuccess: () => { toast.success("Category attached"); setAttachId(""); qc.invalidateQueries(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Attach failed"),
    });

    const detach = useMutation({
        mutationFn: async (cid: string) => (await api.delete(`/admin/products/${productId}/categories/${cid}`)).data,
        onSuccess: () => { toast.success("Category detached"); qc.invalidateQueries(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Detach failed"),
    });

    const available = useMemo(
        () => all.filter(c => !assigned.some(a => a.id === c.id)),
        [all, assigned]
    );

    return (
        <section className="space-y-3">
            <h4 className="font-medium">Categories</h4>

            <div className="flex flex-wrap gap-2">
                {assigned.map(c => (
                    <div key={c.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                        <span>{c.name}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => detach.mutate(c.id)}>✕</button>
                    </div>
                ))}
                {assigned.length === 0 && <div className="text-sm text-muted-foreground">No categories</div>}
            </div>

            <div className="flex items-center gap-3">
                <Select value={attachId} onValueChange={setAttachId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select category to attach" /></SelectTrigger>
                    <SelectContent>
                        {available.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button disabled={!attachId || attach.isPending} onClick={() => attach.mutate()}>Attach</Button>
            </div>
        </section>
    );
}
