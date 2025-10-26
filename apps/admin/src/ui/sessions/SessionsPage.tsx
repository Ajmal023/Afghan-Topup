import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { SessionDTO, SessionListResponse } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SessionsPage() {
    // Toggle: show my sessions vs. query by userId (admin)
    const [showMine, setShowMine] = useState(true);
    const [userId, setUserId] = useState("");

    const enabled = showMine || (!!userId && userId.trim().length > 0);

    const { data, isLoading } = useQuery<SessionListResponse>({
        queryKey: ["sessions", { showMine, userId }],
        queryFn: async () => {
            const params: Record<string, any> = showMine ? { me: "true" } : { userId };
            // Adjust the path if your router is mounted elsewhere
            return (await api.get("/admin/sessions", { params })).data as SessionListResponse;
        },
        enabled,
    });

    const rows = data?.data ?? [];
    const qc = useQueryClient();

    const revokeMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/admin/sessions/${id}`)).data,
        onSuccess: () => { toast.success("Session revoked"); qc.invalidateQueries({ queryKey: ["sessions"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Failed to revoke"),
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Sessions</h3>
                    <p className="text-sm text-muted-foreground">
                        View and revoke refresh-token sessions.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                        <Switch id="mine" checked={showMine} onCheckedChange={setShowMine} />
                        <Label htmlFor="mine">Show my sessions</Label>
                    </div>
                    {!showMine && (
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="User ID…"
                                className="w-[280px]"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                            <Button
                                onClick={() => {
                                    if (!userId.trim()) return toast.error("Enter a user id");
                                }}
                            >
                                Load
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>JTI</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-0 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No sessions</TableCell></TableRow>
                        )}
                        {rows.map((s: SessionDTO) => (
                            <TableRow key={s.id}>
                                <TableCell className="font-mono text-xs">{s.user_id}</TableCell>
                                <TableCell className="font-mono text-xs">{s.jti}</TableCell>
                                <TableCell className="text-muted-foreground">{s.ip ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-[260px]">{s.user_agent ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {new Date(s.expires_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    {s.revoked ? <Badge variant="secondary">Revoked</Badge> : <Badge>Active</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={s.revoked || revokeMutation.isPending}
                                        onClick={() => revokeMutation.mutate(s.id)}
                                    >
                                        Revoke
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
