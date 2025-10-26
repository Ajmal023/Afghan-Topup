// src/ui/users/InternalUsersPage.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { UserDTO, Paginated } from "./types";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function InternalUsersPage() {
    const qc = useQueryClient();

    const [role, setRole] = useState<"admin" | "sales">("sales");
    const [emailFilter, setEmailFilter] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<Paginated<UserDTO>, Error, Paginated<UserDTO>>({
        queryKey: ["users", { role, email: emailFilter, page }],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, limit: 20, role };
            if (emailFilter.trim()) params.email = emailFilter.trim(); // exact match on backend
            return (await api.get("/admin/users", { params })).data as Paginated<UserDTO>;
        },
        placeholderData: (prev) => prev,
    });

    const rows = data?.data ?? [];
    const meta = data?.meta ?? { page: 1, limit: 20, count: 0 };
    const totalPages = Math.max(1, Math.ceil(meta.count / meta.limit));

    // Create/Edit dialog
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<UserDTO | null>(null);

    // When closing dialog, clear editing state so next open starts fresh
    useEffect(() => { if (!open) setEditing(null); }, [open]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="text-lg font-semibold">Users</h3>
                    <p className="text-sm text-muted-foreground">Admins and sales users.</p>
                </div>

                <Button onClick={() => { setEditing(null); setOpen(true); }}>
                    New user
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    {open && (
                        <InternalUserEditor
                            initial={editing ?? undefined}
                            onClose={() => setOpen(false)}
                            onSaved={async () => {
                                setOpen(false);
                                // Make sure new record shows up
                                setPage(1);
                                await qc.invalidateQueries({ queryKey: ["users"] });
                                await qc.refetchQueries({ queryKey: ["users"] });
                            }}
                        />
                    )}
                </Dialog>
            </div>

            {/* Toolbar */}
            <div className="flex gap-3 flex-wrap">
                <div className="w-44">
                    <Label className="text-xs">Role</Label>
                    <Select value={role} onValueChange={(v: "admin" | "sales") => { setRole(v); setPage(1); }}>
                        <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[240px]">
                    <Label className="text-xs">Email (exact match)</Label>
                    <Input
                        name="users-filter-email"              // unique name to avoid autofill bleed
                        autoComplete="off"                     // stop browser from autofilling this
                        placeholder="user@company.com"
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
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
                            <TableHead>Role</TableHead>
                            <TableHead>Verified</TableHead>
                            <TableHead>Last login</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No users</TableCell></TableRow>
                        )}
                        {rows.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                                <TableCell className="font-mono">{u.phone ?? "—"}</TableCell>
                                <TableCell>{u.role}</TableCell>
                                <TableCell>
                                    <span className="text-xs">
                                        {u.is_email_verified ? "Email✓" : "Email×"} • {u.is_phone_verified ? "Phone✓" : "Phone×"}
                                    </span>
                                </TableCell>
                                <TableCell className="tabular-nums">
                                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => { setEditing(u); setOpen(true); }}
                                    >
                                        Edit
                                    </Button>
                                    <DeleteUserButton id={u.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">Page {meta.page} of {totalPages}</span>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                >
                    Prev
                </Button>
                <Button
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

function DeleteUserButton({ id }: { id: string }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);

    const { mutate, isPending } = useMutation({
        mutationFn: async () => (await api.delete(`/admin/users/${id}`)).data,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["users"] });
            await qc.refetchQueries({ queryKey: ["users"] });
            setOpen(false);
            toast.success("User deleted");
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Delete failed"),
    });

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => setOpen(true)}
            >
                Delete
            </Button>

            <ConfirmDialog
                open={open}
                title="Delete this user?"
                description="This action cannot be undone."
                confirmText={isPending ? "Deleting…" : "Delete"}
                danger
                onCancel={() => setOpen(false)}
                onConfirm={() => mutate()}
            />
        </>
    );
}

function InternalUserEditor({
    initial, onClose, onSaved,
}: {
    initial?: UserDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial;
    const [email, setEmail] = useState(initial?.email ?? "");
    const [phone, setPhone] = useState(initial?.phone ?? "");
    const [role, setRole] = useState<"admin" | "sales">(initial?.role === "admin" ? "admin" : "sales");
    const [emailV, setEmailV] = useState<boolean>(initial?.is_email_verified ?? false);
    const [phoneV, setPhoneV] = useState<boolean>(initial?.is_phone_verified ?? false);
    const [password, setPassword] = useState("");

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            if (isEdit) {
                const payload: Record<string, unknown> = {
                    role,
                    is_email_verified: emailV,
                    is_phone_verified: phoneV,
                };
                if (password) payload.password = password;
                return (await api.patch(`/admin/users/${initial!.id}`, payload)).data;
            } else {
                const payload: Record<string, unknown> = {
                    email,
                    role,
                    phone: phone || undefined,
                };
                if (password) payload.password = password;
                return (await api.post(`/admin/users`, payload)).data;
            }
        },
        onSuccess: () => {
            toast.success(isEdit ? "User updated" : "User created");
            onSaved(); // parent will refetch + close + jump to page 1
        },
        onError: (e: any) =>
            toast.error(e?.response?.data?.error || (isEdit ? "Update failed" : "Create failed")),
    });

    return (
        <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
                <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        name="internal-user-email"            // unique name
                        autoComplete="email"                  // let browser fill here instead of filter
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isEdit}
                        required
                        autoFocus={!isEdit}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input
                        name="internal-user-phone"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isEdit}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={(v: "admin" | "sales") => setRole(v)}>
                        <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Password {isEdit ? "(leave blank to keep)" : ""}</Label>
                    <Input
                        type="password"
                        name="internal-user-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {isEdit && (
                    <>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="font-medium">Email verified</Label>
                            <Switch checked={emailV} onCheckedChange={setEmailV} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="font-medium">Phone verified</Label>
                            <Switch checked={phoneV} onCheckedChange={setPhoneV} />
                        </div>
                    </>
                )}
            </div>

            <DialogFooter className="mt-4">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || (!isEdit && !email)}>
                    {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save" : "Create")}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
