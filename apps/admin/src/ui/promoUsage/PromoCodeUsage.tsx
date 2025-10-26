// src/pages/admin/PromoUsagePage.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, DollarSign, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface PromoUsage {
    id: string;
    customer_uid: string;
    original_amount: number;
    discount_amount: number;
    final_amount: number;
    created_at: string;
    Transaction?: {
        phone_number: string;
        status: string;
    };
}

interface PromoCodeDetails {
    id: string;
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    usage_limit: number;
    used_count: number;
    PromoUses: PromoUsage[];
}

export default function PromoUsagePage() {
    const { id } = useParams<{ id: string }>();

    const { data: promoCode, isLoading, error } = useQuery<PromoCodeDetails>({
        queryKey: ["admin-promo-code", id],
        queryFn: async () => {
            const response = await api.get(`/promo/admin/promo-codes/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !promoCode) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">Error loading promo code details</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/admin/promo-codes">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Promo Codes
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">Promo Code Usage</h1>
                </div>
            </div>

            {/* Promo Code Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Promo Code Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Code</label>
                            <p className="text-lg font-mono font-bold">{promoCode.code}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Discount</label>
                            <p className="text-lg font-bold">
                                {promoCode.discount_type === 'fixed' ? '$' : ''}
                                {promoCode.discount_value}
                                {promoCode.discount_type === 'percentage' ? '%' : ''}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Usage</label>
                            <p className="text-lg font-bold">
                                {promoCode.used_count} / {promoCode.usage_limit}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <Badge variant={
                                promoCode.used_count >= promoCode.usage_limit ? "secondary" : 
                                new Date() > new Date(promoCode.valid_until) ? "outline" : "default"
                            }>
                                {promoCode.used_count >= promoCode.usage_limit ? "Limit Reached" : 
                                 new Date() > new Date(promoCode.valid_until) ? "Expired" : "Active"}
                            </Badge>
                        </div>
                    </div>
                    {promoCode.description && (
                        <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <p className="text-sm">{promoCode.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Usage Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Discount Given</p>
                                <p className="text-2xl font-bold">
                                    ${promoCode.PromoUses.reduce((sum, use) => sum + use.discount_amount, 0).toFixed(2)}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                                <p className="text-2xl font-bold">{promoCode.PromoUses.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Average Discount</p>
                                <p className="text-2xl font-bold">
                                    ${(promoCode.PromoUses.reduce((sum, use) => sum + use.discount_amount, 0) / promoCode.PromoUses.length || 0).toFixed(2)}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Usage History */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer UID</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Original Amount</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Final Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promoCode.PromoUses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No usage recorded yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    promoCode.PromoUses.map((usage) => (
                                        <TableRow key={usage.id}>
                                            <TableCell className="font-mono text-sm">
                                                {usage.customer_uid}
                                            </TableCell>
                                            <TableCell>
                                                {usage.Transaction?.phone_number || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-gray-600" />
                                                    {usage.original_amount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-red-600">
                                                    -{usage.discount_amount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <DollarSign className="h-4 w-4 text-green-600" />
                                                    {usage.final_amount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(usage.created_at).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    usage.Transaction?.status === 'Paid' ? 'default' : 
                                                    usage.Transaction?.status === 'Pending' ? 'outline' : 'secondary'
                                                }>
                                                    {usage.Transaction?.status || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}