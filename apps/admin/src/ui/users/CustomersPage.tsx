// src/ui/users/CustomersPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose,
} from "@/components/ui/drawer"; // if you don’t have a Drawer, use Dialog with side sheet styling
import type { UserDTO, Paginated } from "./types";

type Overview = {
    user: UserDTO;
    stats: {
        total_orders: number;
        total_spent_minor: number;
        currency_hint: string;
        first_order_at: string | null;
        last_order_at: string | null;
        contacts_count: number;
        recurrings_count: number;
        active_recurrings: number;
        last_payment_attempt_at: string | null;
    };
    contacts: any[];
    recurrings: any[];
    recent_orders: any[];
    recent_payment_intents: any[];
    promo_uses: any[];
    referral_codes_owned: any[];
    referred_by: any | null;
    referred_out_uses: any[];
};

export default function CustomersPage() {
    const [email, setEmail] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<UserDTO | null>(null);

    const { data, isLoading } = useQuery<Paginated<UserDTO>, Error, Paginated<UserDTO>>({
        queryKey: ["customers", { email, page }],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, limit: 20, role: "customer" };
            if (email.trim()) params.email = email.trim();
            return (await api.get("/admin/users", { params })).data as Paginated<UserDTO>;
        },
        placeholderData: (prev) => prev,
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Customers</h3>
                <p className="text-sm text-muted-foreground">End users who signed up.</p>
            </div>

            {/* Toolbar */}
            <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                    <Label className="text-xs">Email (exact match)</Label>
                    <Input
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && setPage(1)}
                    />
                </div>
                <Button variant="secondary" onClick={() => setPage(1)}>Apply</Button>
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Verified</TableHead>
                            <TableHead>Last login</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No customers</TableCell></TableRow>
                        )}
                        {rows.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                                <TableCell className="font-mono">{u.phone ?? "—"}</TableCell>
                                <TableCell>
                                    <span className="text-xs">
                                        {u.is_email_verified ? "Email✓" : "Email×"} • {u.is_phone_verified ? "Phone✓" : "Phone×"}
                                    </span>
                                </TableCell>
                                <TableCell className="tabular-nums">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" onClick={() => setSelected(u)}>View</Button>
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

            {/* Drawer overview */}
            {selected && (
                <CustomerOverviewDrawer user={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

function money(minor: number, code = "AFN") {
    const dec = code.toUpperCase() === "USD" ? 2 : 2;
    const v = minor / Math.pow(10, dec);
    return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function CustomerOverviewDrawer({ user, onClose }: { user: UserDTO; onClose: () => void; }) {
    const { data, isLoading } = useQuery<{ data: Overview }>({
        queryKey: ["customer-overview", user.id],
        queryFn: async () => (await api.get(`/admin/customers/${user.id}/overview`)).data,
    });

    const ov = data?.data;

    return (
        <Drawer open onOpenChange={(o) => !o && onClose()}>
            <DrawerContent className="p-0 md:max-w-[880px] md:ml-auto md:rounded-l-2xl">
                <DrawerHeader className="px-6 pt-6">
                    <DrawerTitle>Customer overview</DrawerTitle>
                    <DrawerDescription>{user.email}</DrawerDescription>
                </DrawerHeader>

                <div className="px-6 pb-6 space-y-6">
                    {isLoading || !ov ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : (
                        <>
                            {/* Top summary cards */}
                            <div className="grid gap-3 sm:grid-cols-3">
                                <SummaryCard label="Total orders" value={ov.stats.total_orders} />
                                <SummaryCard label="Total spent" value={`${money(ov.stats.total_spent_minor, ov.stats.currency_hint)} ${ov.stats.currency_hint}`} />
                                <SummaryCard label="Active recurrings" value={ov.stats.active_recurrings} />
                            </div>

                            {/* Contacts & Recurrings */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <Box title={`Contacts (${ov.contacts.length})`}>
                                    {ov.contacts.length === 0 ? (
                                        <Empty text="No contacts" />
                                    ) : (
                                        <ul className="space-y-2 text-sm">
                                            {ov.contacts.slice(0, 6).map((c: any) => (
                                                <li key={c.id} className="flex justify-between">
                                                    <span className="font-medium">{c.name}</span>
                                                    <span className="font-mono">{c.msisdn}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Box>

                                <Box title={`Recurrings (${ov.recurrings.length})`}>
                                    {ov.recurrings.length === 0 ? (
                                        <Empty text="No recurrings" />
                                    ) : (
                                        <ul className="space-y-2 text-sm">
                                            {ov.recurrings.slice(0, 6).map((r: any) => (
                                                <li key={r.id} className="flex justify-between">
                                                    <span>{r.frequency} • {r.ProductVariant?.name ?? "Variant"}</span>
                                                    <span className="font-mono">{new Date(r.next_run_at).toLocaleDateString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Box>
                            </div>

                            {/* Recent activity */}
                            <Box title="Recent orders">
                                {ov.recent_orders.length === 0 ? <Empty text="No orders" /> : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Order</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ov.recent_orders.map((o: any) => (
                                                <TableRow key={o.id}>
                                                    <TableCell className="font-mono">{o.order_no}</TableCell>
                                                    <TableCell>{o.status}</TableCell>
                                                    <TableCell className="tabular-nums">{money(Number(o.total_minor))} AFN</TableCell>
                                                    <TableCell className="text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>

                            <Box title="Recent payment intents">
                                {ov.recent_payment_intents.length === 0 ? <Empty text="No payment attempts" /> : (
                                    <ul className="space-y-2 text-sm">
                                        {ov.recent_payment_intents.map((p: any) => (
                                            <li key={p.id} className="flex justify-between">
                                                <span>{p.provider} • {p.status}</span>
                                                <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Box>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Box title="Promo uses">
                                    {ov.promo_uses.length === 0 ? <Empty text="No promos used" /> : (
                                        <ul className="space-y-2 text-sm">
                                            {ov.promo_uses.map((u: any) => (
                                                <li key={u.id} className="flex justify-between">
                                                    <span>{u.PromoCode?.code ?? "—"}</span>
                                                    <span className="text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Box>
                                <Box title="Referrals">
                                    <div className="space-y-2 text-sm">
                                        <div>Referred by: {ov.referred_by ? ov.referred_by.code ?? "(code)" : "—"}</div>
                                        <div>Codes owned: {ov.referral_codes_owned.map((c: any) => c.code).join(", ") || "—"}</div>
                                        <div>Referrals made: {ov.referred_out_uses.length}</div>
                                    </div>
                                </Box>
                            </div>

                            <div className="flex justify-end">
                                <DrawerClose asChild>
                                    <Button variant="secondary">Close</Button>
                                </DrawerClose>
                            </div>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
        </div>
    );
}
function Box({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border p-4">
            <div className="mb-3 text-sm font-medium">{title}</div>
            {children}
        </div>
    );
}
function Empty({ text }: { text: string }) {
    return <div className="text-sm text-muted-foreground">{text}</div>;
}
