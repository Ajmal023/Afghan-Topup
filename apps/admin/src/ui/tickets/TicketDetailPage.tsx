import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { TicketDTO, TicketCommentDTO, TicketPriority, TicketStatus, UserLite } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const statusOptions: TicketStatus[] = ["open", "pending", "closed"];
const priorityOptions: TicketPriority[] = ["low", "normal", "high"];

export default function TicketDetailPage() {
    const { id = "" } = useParams();
    const qc = useQueryClient();

    const { data: tRes, isLoading: tLoading } = useQuery<{ data: TicketDTO }>({
        queryKey: ["ticket", id],
        queryFn: async () => (await api.get(`/admin/tickets/${id}`)).data as { data: TicketDTO },
        enabled: !!id,
    });
    const ticket = tRes?.data;

    const { data: commentsRes, isLoading: cLoading } = useQuery<{ data: TicketCommentDTO[] }>({
        queryKey: ["ticket-comments", id],
        queryFn: async () => (await api.get(`/admin/tickets/${id}/comments`)).data as { data: TicketCommentDTO[] },
        enabled: !!id,
    });
    const comments = commentsRes?.data ?? [];

    const { data: staffRes } = useQuery<UserLite[]>({
        queryKey: ["users", "staff"],
        queryFn: async () => {
            const [admins, sales] = await Promise.all([
                api.get("/admin/users", { params: { role: "admin", limit: 100 } }),
                api.get("/admin/users", { params: { role: "sales", limit: 100 } }),
            ]);
            return [...admins.data.data, ...sales.data.data].map((u: any) => ({
                id: u.id, email: u.email, role: u.role,
            })) as UserLite[];
        },
        staleTime: 60_000,
    });
    const staff = staffRes ?? [];

    const updateMutation = useMutation({
        mutationFn: async (
            payload: Partial<Pick<TicketDTO, "status" | "priority" | "assignee_user_id">>
        ) => (await api.patch(`/admin/tickets/${id}`, payload)).data as { data: TicketDTO },
        onSuccess: () => {
            toast.success("Ticket updated");
            qc.invalidateQueries({ queryKey: ["ticket", id] });
            qc.invalidateQueries({ queryKey: ["tickets"] });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Update failed"),
    });

    const [body, setBody] = useState("");
    const [internal, setInternal] = useState(false);

    const commentMutation = useMutation({
        mutationFn: async () =>
            (await api.post(`/admin/tickets/${id}/comments`, { body, internal })).data as { data: TicketCommentDTO },
        onSuccess: () => {
            toast.success("Comment posted");
            setBody("");
            setInternal(false);
            qc.invalidateQueries({ queryKey: ["ticket-comments", id] });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || "Comment failed"),
    });

    if (tLoading || !ticket) {
        return <div className="text-sm text-muted-foreground">Loading ticket…</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-xs text-muted-foreground">Ticket #{ticket.id.slice(0, 8)}</div>
                    <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                    <div className="mt-1 flex gap-2">
                        <Badge variant="secondary">Customer: {ticket.customer_user_id ?? "guest"}</Badge>
                        <Badge variant="secondary">Assignee: {ticket.assignee_user_id ?? "—"}</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[320px]">
                    {/* Status */}
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Status</div>
                        <Select
                            value={ticket.status}
                            onValueChange={(v: string) => updateMutation.mutate({ status: v as TicketStatus })}
                        >
                            <SelectTrigger><SelectValue placeholder="Set status" /></SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Priority */}
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Priority</div>
                        <Select
                            value={ticket.priority}
                            onValueChange={(v: string) => updateMutation.mutate({ priority: v as TicketPriority })}
                        >
                            <SelectTrigger><SelectValue placeholder="Set priority" /></SelectTrigger>
                            <SelectContent>
                                {priorityOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assignee */}
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Assignee</div>
                        <Select
                            value={ticket.assignee_user_id ?? "unassigned"}
                            onValueChange={(v: string) =>
                                updateMutation.mutate({ assignee_user_id: v === "unassigned" ? null : v })
                            }
                        >
                            <SelectTrigger><SelectValue placeholder="Assign…" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {staff.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.email ?? u.id} ({u.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Comments */}
            <div className="grid gap-6 md:grid-cols-[1fr_380px]">
                <div className="rounded-2xl border p-4">
                    <div className="mb-2 text-sm text-muted-foreground">Conversation</div>
                    <div className="space-y-4">
                        {cLoading && <div className="text-sm text-muted-foreground">Loading comments…</div>}
                        {!cLoading && comments.length === 0 && (
                            <div className="text-sm text-muted-foreground">No comments yet</div>
                        )}
                        {comments.map((c) => (
                            <div key={c.id} className="rounded-lg border p-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>by {c.author_user_id}</span>
                                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="mt-2 whitespace-pre-wrap text-sm">{c.body}</div>
                                {c.internal && (
                                    <div className="mt-1 text-[10px] uppercase tracking-wide">
                                        <Badge variant="outline">Internal</Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Composer */}
                <div className="rounded-2xl border p-4 h-fit">
                    <div className="mb-2 text-sm text-muted-foreground">Add a comment</div>
                    <div className="space-y-3">
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write a reply…"
                            rows={6}
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Switch checked={internal} onCheckedChange={setInternal} id="internal" />
                                <Label htmlFor="internal">Internal note</Label>
                            </div>
                            <Button disabled={!body.trim()} onClick={() => commentMutation.mutate()}>
                                Post
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Internal notes are visible only to staff (admin/sales).
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
