// src/ui/products/ProductsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ProductDTO, ProductListResponse, ProductTypeDTO } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

// NEW (shadcn)
import { MoreVertical, Pencil, Trash2, Eye } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type OperatorLite = { id: string; name: string; code: string };

export default function ProductsPage() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const [q, setQ] = useState("");
    const [active, setActive] = useState<"all" | "true" | "false">("all");
    const [typeId, setTypeId] = useState<string | "">("");
    const [operatorId, setOperatorId] = useState<string | "">(""); // NEW
    const [page, setPage] = useState(1);

    const { data: typesRes } = useQuery<{ data: ProductTypeDTO[] }>({
        queryKey: ["product-types"],
        queryFn: async () => (await api.get("/admin/product-types")).data,
        staleTime: 60_000,
    });
    const types = typesRes?.data ?? [];

    const { data: opsRes } = useQuery<{ data: OperatorLite[] }>({
        queryKey: ["operators-lite"],
        queryFn: async () => (await api.get("/admin/operators")).data,
        staleTime: 60_000,
    });
    const operators = opsRes?.data ?? [];

    const { data, isLoading } = useQuery<ProductListResponse>({
        queryKey: ["products", { q, active, typeId, operatorId, page }],
        queryFn: async () => {
            const params: any = { page, limit: 20 };
            if (q) params.q = q;
            if (typeId) params.type = typeId;
            if (operatorId) params.operator = operatorId;
            if (active !== "all") params.active = active;
            return (await api.get("/admin/products", { params })).data as ProductListResponse;
        },
        placeholderData: (prev) => prev,
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    // Create/edit dialog
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ProductDTO | null>(null);

    return (
        <div className="space-y-6">
            {/* Top toolbar only (no page title) */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1">
                    <Input
                        placeholder="Search by name or SKU…"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Select value={typeId || "all"} onValueChange={(v) => { setTypeId(v === "all" ? "" : v); setPage(1); }}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            {types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={operatorId || "all"} onValueChange={(v) => { setOperatorId(v === "all" ? "" : v); setPage(1); }}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="All operators" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All operators</SelectItem>
                            {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={active} onValueChange={(v) => { setActive(v as any); setPage(1); }}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setEditing(null); setOpen(true); }}>New product</Button>
                        </DialogTrigger>
                        {open && (
                            <ProductEditor
                                initial={editing ?? undefined}
                                onClose={() => setOpen(false)}
                                onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["products"] }); }}
                            />
                        )}
                    </Dialog>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>Variants</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-0 text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No products</TableCell></TableRow>
                        )}

                        {rows.map((p) => (
                            <TableRow key={p.id} className="hover:bg-accent/40">
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                                <TableCell>{p.ProductType?.name ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{p.operator_id ?? "—"}</TableCell>
                                <TableCell>{p.ProductVariants?.length ?? 0}</TableCell>
                                <TableCell>{p.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <RowActions id={p.id} onView={() => nav(`/products/${p.id}`)} onEdit={() => { setEditing(p); setOpen(true); }} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">Page {meta.page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
        </div>
    );
}

function RowActions({ id, onView, onEdit }: { id: string; onView: () => void; onEdit: () => void }) {
    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => (await api.delete(`/admin/products/${id}`)).data,
        onSuccess: () => { toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["products"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onView}><Eye size={14} className="mr-2" /> View</DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}><Pencil size={14} className="mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This cannot be undone. Variants must be removed first.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction disabled={isPending} onClick={() => mutate()}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// in the same file above (bottom) – smaller, focused editor without description text
function ProductEditor({
    initial, onClose, onSaved,
}: { initial?: ProductDTO; onClose: () => void; onSaved: () => void; }) {
    const isEdit = !!initial;

    const [name, setName] = useState(initial?.name ?? "");
    const [sku, setSku] = useState(initial?.sku ?? "");
    const [productTypeId, setProductTypeId] = useState(initial?.product_type_id ?? "");
    const [operatorId, setOperatorId] = useState<string | "">(initial?.operator_id ?? "");
    const [active, setActive] = useState<boolean>(initial?.is_active ?? true);

    // custom USD config
    const [allowCustomUsd, setAllowCustomUsd] = useState<boolean>(initial?.allow_custom_amount_usd ?? false);
    const [minUsd, setMinUsd] = useState<string>(initial?.custom_min_usd_minor?.toString() ?? "");
    const [maxUsd, setMaxUsd] = useState<string>(initial?.custom_max_usd_minor?.toString() ?? "");
    const [stepUsd, setStepUsd] = useState<string>(initial?.custom_step_usd_minor?.toString() ?? "");

    const { data: typesRes } = useQuery<{ data: ProductTypeDTO[] }>({
        queryKey: ["product-types"],
        queryFn: async () => (await api.get("/admin/product-types")).data,
        staleTime: 60_000,
    });
    const types = typesRes?.data ?? [];

    const { data: opsRes } = useQuery<{ data: { id: string; name: string; code: string }[] }>({
        queryKey: ["operators-lite"],
        queryFn: async () => (await api.get("/admin/operators")).data,
        staleTime: 60_000,
    });
    const operators = opsRes?.data ?? [];

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload: any = {
                name,
                sku: sku || undefined,
                product_type_id: productTypeId,
                operator_id: operatorId || null,
                is_active: active,
                allow_custom_amount_usd: allowCustomUsd,
                custom_min_usd_minor: minUsd === "" ? null : Number(minUsd),
                custom_max_usd_minor: maxUsd === "" ? null : Number(maxUsd),
                custom_step_usd_minor: stepUsd === "" ? null : Number(stepUsd),
            };
            if (isEdit) return (await api.patch(`/admin/products/${initial!.id}`, payload)).data;
            return (await api.post(`/admin/products`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Product updated" : "Product created"); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    return (
        <DialogContent className="sm:max-w-[560px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div>
                    <label className="text-sm font-medium">SKU (optional)</label>
                    <Input value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>

                <div>
                    <label className="text-sm font-medium">Product type</label>
                    <Select value={productTypeId} onValueChange={setProductTypeId}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-sm font-medium">Operator (optional)</label>
                    <Select value={operatorId || "none"} onValueChange={(v) => setOperatorId(v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Pick operator" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <div className="font-medium text-sm">Active</div>
                        <div className="text-xs text-muted-foreground">Visible and purchasable</div>
                    </div>
                    <Switch checked={active} onCheckedChange={setActive} />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <div className="font-medium text-sm">Allow custom USD amount</div>
                        <div className="text-xs text-muted-foreground">Customer can enter any USD value (respecting range).</div>
                    </div>
                    <Switch checked={allowCustomUsd} onCheckedChange={setAllowCustomUsd} />
                </div>

                {allowCustomUsd && (
                    <>
                        <div>
                            <label className="text-sm font-medium">Min USD (minor)</label>
                            <Input type="number" value={minUsd} onChange={(e) => setMinUsd(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Max USD (minor)</label>
                            <Input type="number" value={maxUsd} onChange={(e) => setMaxUsd(e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-sm font-medium">Step USD (minor)</label>
                            <Input type="number" value={stepUsd} onChange={(e) => setStepUsd(e.target.value)} />
                        </div>
                    </>
                )}
            </div>

            <DialogFooter className="mt-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !name || !productTypeId}>
                    {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save" : "Create")}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
