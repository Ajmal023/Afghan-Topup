// src/ui/catalog/CurrenciesPage.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { CurrencyDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function CurrenciesPage() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<{ data: CurrencyDTO[] }, Error, { data: CurrencyDTO[] }>({
        queryKey: ["currencies"],
        queryFn: async () => (await api.get("/admin/currencies")).data,
        placeholderData: (prev) => prev,
    });

    const rows = data?.data ?? [];
    const base = useMemo(() => rows.find((c) => c.is_base)?.code, [rows]);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CurrencyDTO | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Currencies</h3>
                    <p className="text-sm text-muted-foreground">Manage base currency and rates to base.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditing(null); setOpen(true); }}>Add / Upsert</Button>
                    </DialogTrigger>
                    {open && (
                        <CurrencyEditor
                            initial={editing ?? undefined}
                            onClose={() => setOpen(false)}
                            onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["currencies"] }); }}
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
                            <TableHead>Symbol</TableHead>
                            <TableHead>Decimals</TableHead>
                            <TableHead>Rate → Base</TableHead>
                            <TableHead>Base?</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No currencies</TableCell></TableRow>
                        )}
                        {rows.map((c) => (
                            <TableRow key={c.code}>
                                <TableCell className="font-mono">{c.code}</TableCell>
                                <TableCell>{c.name ?? "—"}</TableCell>
                                <TableCell>{c.symbol ?? "—"}</TableCell>
                                <TableCell>{c.decimals ?? "—"}</TableCell>
                                <TableCell>{c.rate_to_base ?? "—"}</TableCell>
                                <TableCell>{c.is_base ? "Yes" : "No"}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => { setEditing(c); setOpen(true); }}
                                    >
                                        Edit
                                    </Button>
                                    {!c.is_base && <MakeBaseButton code={c.code} />}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Converter base={base} />
        </div>
    );
}

function MakeBaseButton({ code }: { code: string }) {
    const qc = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: async () => (await api.put(`/admin/currencies/${code}`, { is_base: true })).data,
        onSuccess: () => { toast.success(`${code} is now base currency`); qc.invalidateQueries({ queryKey: ["currencies"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Failed to make base"),
    });
    return (
        <Button size="sm" disabled={isPending} onClick={() => mutate()}>
            Make base
        </Button>
    );
}

function CurrencyEditor({
    initial, onClose, onSaved,
}: {
    initial?: CurrencyDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;
    const [code, setCode] = useState(initial?.code ?? "");
    const [name, setName] = useState(initial?.name ?? "");
    const [symbol, setSymbol] = useState(initial?.symbol ?? "");
    const [decimals, setDecimals] = useState<number | "">(initial?.decimals ?? "");
    const [rate, setRate] = useState<number | "">(initial?.rate_to_base ?? "");
    const [isBase, setIsBase] = useState(initial?.is_base ?? false);
    const [notes, setNotes] = useState(initial?.notes ?? "");

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const payload = {
                name: name || undefined,
                symbol: symbol || undefined,
                decimals: decimals === "" ? undefined : Number(decimals),
                rate_to_base: rate === "" ? undefined : Number(rate),
                is_base: isBase,
                notes: notes || undefined,
            };
            return (await api.put(`/admin/currencies/${(code || "").toUpperCase()}`, payload)).data;
        },
        onSuccess: () => { toast.success(isEdit ? "Currency updated" : "Currency upserted"); onSaved(); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Save failed"),
    });

    return (
        <DialogContent className="sm:max-w-[560px]">
            <DialogHeader><DialogTitle>{isEdit ? "Edit currency" : "Upsert currency"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-1">
                    <Label>Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required disabled={isEdit} />
                </div>
                <div className="space-y-2 sm:col-span-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-1">
                    <Label>Symbol</Label>
                    <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-1">
                    <Label>Decimals</Label>
                    <Input
                        type="number"
                        value={decimals}
                        onChange={(e) => setDecimals(e.target.value === "" ? "" : Number(e.target.value))}
                        min={0}
                        max={8}
                    />
                </div>
                <div className="space-y-2 sm:col-span-1">
                    <Label>Rate to base</Label>
                    <Input
                        type="number"
                        step="0.000001"
                        value={rate}
                        onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                </div>
                <div className="space-y-2 sm:col-span-1">
                    <Label>Base currency?</Label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsBase((v: boolean) => !v)}
                            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-accent"
                        >
                            {isBase ? "Yes" : "No"}
                        </button>
                    </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
            </div>
            <DialogFooter className="mt-4">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !code}>
                    {isPending ? "Saving…" : "Save"}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function Converter({ base }: { base?: string }) {
    const [amountMinor, setAmountMinor] = useState<string>("10000");
    const [from, setFrom] = useState<string>(base || "AFN");
    const [to, setTo] = useState<string>("USD");
    const [result, setResult] = useState<string | null>(null);

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const params = { amount_minor: amountMinor, from, to };
            return (await api.get(`/admin/currencies/convert`, { params })).data as {
                input: { amount_minor: string; from: string; to: string };
                output_minor: string;
            };
        },
        onSuccess: (d) => setResult(d.output_minor),
        onError: (e: any) => toast.error(e?.response?.data?.error || "Convert failed"),
    });

    return (
        <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground mb-2">Quick convert (minor units)</div>
            <div className="grid gap-3 sm:grid-cols-4">
                <Input value={amountMinor} onChange={(e) => setAmountMinor(e.target.value)} placeholder="amount_minor" />
                <Input value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} placeholder="FROM" />
                <Input value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} placeholder="TO" />
                <Button disabled={isPending || !amountMinor || !from || !to} onClick={() => mutate()}>
                    {isPending ? "Converting…" : "Convert"}
                </Button>
            </div>
            {result && <div className="mt-2 text-sm">Output (minor): <span className="font-mono">{result}</span></div>}
        </div>
    );
}
