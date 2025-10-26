import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { TopupLogDetail } from "./types";
import { Badge } from "@/components/ui/badge";

export default function TopupLogDetailPage() {
    const { id = "" } = useParams();

    const { data, isLoading } = useQuery<{ data: TopupLogDetail }>({
        queryKey: ["topup-log", id],
        queryFn: async () => (await api.get(`/admin/topup-logs/${id}`)).data as { data: TopupLogDetail },
        enabled: !!id,
    });

    const log = data?.data;

    if (isLoading || !log) {
        return <div className="text-sm text-muted-foreground">Loading log…</div>;
    }

    const statusChip =
        log.status === "failed" ? <Badge variant="destructive">Failed</Badge>
            : log.status === "delivered" ? <Badge>Delivered</Badge>
                : <Badge variant="secondary">{log.status}</Badge>;

    return (
        <div className="space-y-6">
            <div>
                <div className="text-xs text-muted-foreground">Log #{log.id.slice(0, 8)}</div>
                <h3 className="text-lg font-semibold">Top-up result</h3>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="mt-1">{statusChip}</div>
                </div>
                <div className="rounded-2xl border p-4">
                    <div className="text-sm text-muted-foreground">Provider</div>
                    <div className="mt-1 font-medium">{log.provider}</div>
                    <div className="text-xs text-muted-foreground break-all">{log.provider_txn_id ?? "—"}</div>
                </div>
                <div className="rounded-2xl border p-4">
                    <div className="text-sm text-muted-foreground">Operator</div>
                    <div className="mt-1 font-medium">{log.Operator?.name ?? log.operator_id}</div>
                    <div className="text-xs text-muted-foreground">{log.Operator?.code ?? "—"}</div>
                </div>
                <div className="rounded-2xl border p-4">
                    <div className="text-sm text-muted-foreground">MSISDN</div>
                    <div className="mt-1">{log.msisdn ?? "—"}</div>
                </div>
            </div>

            {/* Order item / product */}
            <div className="rounded-2xl border p-4">
                <div className="mb-2 text-sm text-muted-foreground">Order / Product</div>
                <div className="text-sm">
                    <div>Order: <span className="font-mono">{log.OrderItem?.Order?.id ?? "—"}</span> ({log.OrderItem?.Order?.status ?? "—"})</div>
                    <div>Variant: <span className="font-medium">{log.OrderItem?.ProductVariant?.name ?? "—"}</span></div>
                </div>
            </div>

            {/* Payloads */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                    <div className="mb-2 text-sm text-muted-foreground">Request payload (redacted)</div>
                    <pre className="text-xs overflow-auto">{JSON.stringify(log.request_payload ?? {}, null, 2)}</pre>
                </div>
                <div className="rounded-2xl border p-4">
                    <div className="mb-2 text-sm text-muted-foreground">Response payload (redacted)</div>
                    <pre className="text-xs overflow-auto">{JSON.stringify(log.response_payload ?? {}, null, 2)}</pre>
                </div>
            </div>

            {/* Error */}
            {(log.error_code || log.error_message) && (
                <div className="rounded-2xl border p-4">
                    <div className="mb-2 text-sm text-muted-foreground">Error</div>
                    <div className="text-sm">
                        Code: <span className="font-mono">{log.error_code ?? "—"}</span><br />
                        Message: <span className="font-mono">{log.error_message ?? "—"}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
