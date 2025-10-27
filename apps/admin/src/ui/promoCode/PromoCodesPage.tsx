import React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";


import { Search, Plus, Edit, Trash2, MoreVertical, Tag, Users, Calendar, DollarSign, Eye, Copy } from "lucide-react";

interface PromoCode {
    id: string;
    code: string;
    description: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    max_discount: number | null;
    min_order_amount: number;
    usage_limit: number;
    Owner?: {
        first_name?: string;
        last_name?: string;
    };
    used_count: number;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    is_public: boolean;
    customer_uid: string | null;
    created_at: string;
    PromoUses: any[];
    PromoCodeRequest?: {
        customer_uid: string;
        first_name: string;
        last_name: string;
        email: string;
        whatsapp_number: string;
    };
}

interface PromoCodesResponse {
    data: {
        rows: PromoCode[];
        count: number;
    };
    meta: {
        page: number;
        limit: number;
        count: number;
    };
}

export default function PromoCodesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredPromos, setFilteredPromos] = useState<PromoCode[]>([]);

    const { data: promoCodesResponse, isLoading, error } = useQuery<PromoCodesResponse>({
        queryKey: ["admin-promo-codes"],
        queryFn: async () => {
            const response = await api.get("/promo/admin/promo-codes");
            return response.data;
        },
    });

    const promoCodes = promoCodesResponse?.data?.rows || [];


    useEffect(() => {
        if (promoCodes) {
            const filtered = promoCodes.filter(promo => 
                promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                promo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (promo.PromoCodeRequest?.first_name + ' ' + promo.PromoCodeRequest?.last_name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                promo.PromoCodeRequest?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredPromos(filtered);
        }
    }, [promoCodes, searchTerm]);

    const getStatusBadge = (promo: PromoCode) => {
        const now = new Date();
        const validUntil = new Date(promo.valid_until);
        const validFrom = new Date(promo.valid_from);
        
        if (!promo.is_active) {
            return <Badge variant="destructive">Inactive</Badge>;
        }
        
        if (now < validFrom) {
            return <Badge variant="secondary">Scheduled</Badge>;
        }
        
        if (validUntil < now) {
            return <Badge variant="outline">Expired</Badge>;
        }
        
        if (promo.used_count >= promo.usage_limit) {
            return <Badge variant="secondary">Limit Reached</Badge>;
        }
        
        return <Badge variant="default">Active</Badge>;
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Tag className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading Promo Codes</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load promo codes. Please try again."}
                    </p>
                    <Button 
                        onClick={() => window.location.reload()} 
                        className="mt-4"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tag className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">Promo Codes</h1>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/promo-requests">
                        <Button variant="outline">
                            <Users className="h-4 w-4 mr-2" />
                            View Requests
                        </Button>
                    </Link>
                    <AddPromoCodeDialog />
                </div>
            </div>

      
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Codes</p>
                                <p className="text-2xl font-bold">{promoCodes.length}</p>
                            </div>
                            <Tag className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Codes</p>
                                <p className="text-2xl font-bold">
                                    {promoCodes.filter(p => p.is_active && new Date(p.valid_until) > new Date() && new Date(p.valid_from) <= new Date()).length}
                                </p>
                            </div>
                            <Badge variant="default" className="h-6 w-6 bg-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                                <p className="text-2xl font-bold">
                                    {promoCodes.reduce((sum, promo) => sum + promo.used_count, 0)}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Personalized</p>
                                <p className="text-2xl font-bold">
                                    {promoCodes.filter(p => !p.is_public).length}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>


        
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>Promo Codes List</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search promo codes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead>Validity</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && filteredPromos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {promoCodes.length > 0 ? 'No promo codes match your search' : 'No promo codes found'}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {filteredPromos.map((promo) => (
                                    <PromoTableRow key={promo.id} promo={promo} getStatusBadge={getStatusBadge} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
  
        </div>
    );
}

function PromoTableRow({ promo, getStatusBadge }: { promo: PromoCode; getStatusBadge: (promo: PromoCode) => React.ReactElement }) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/promo/admin/promo-codes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
            toast.success("Promo code deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to delete promo code");
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            await api.put(`/promo/admin/promo-codes/${id}`, { is_active });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
            toast.success("Promo code status updated");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update promo code");
        },
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Code copied to clipboard");
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this promo code?")) {
            deleteMutation.mutate(promo.id);
        }
    };

    const handleToggleStatus = () => {
        toggleStatusMutation.mutate({ id: promo.id, is_active: !promo.is_active });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <TableRow key={promo.id}>
            <TableCell>
                <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{promo.code}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(promo.code)}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
            </TableCell>
            <TableCell className="max-w-xs truncate" title={promo.description}>
                {promo.description || 'No description'}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span>
                        {promo.discount_type === 'fixed' ? '$' : ''}
                        {promo.discount_value}
                        {promo.discount_type === 'percentage' ? '%' : ''}
                    </span>
                    {promo.max_discount && promo.discount_type === 'percentage' && (
                        <span className="text-xs text-muted-foreground">
                            (max ${promo.max_discount})
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline">
                    {promo.used_count} / {promo.usage_limit}
                </Badge>
            </TableCell>
            <TableCell>
                <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {formatDate(promo.valid_from)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(promo.valid_until)}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={promo?.customer_uid ? "secondary" : "default"}>
               
                    {promo?.customer_uid ? 'Personalized' : 'Public'}

                </Badge>
                {promo.customer_uid && (
                <div
                    className="text-xs text-muted-foreground mt-1 truncate"
                    title={`${promo.Owner?.first_name ?? 'Unknown'} ${promo.Owner?.last_name ?? ''}`}
                >
                    {promo.Owner?.first_name ?? 'Unknown'} {promo.Owner?.last_name ?? ''}
                </div>
                )}
            </TableCell>
            <TableCell>{getStatusBadge(promo)}</TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <ViewPromoCodeDialog promo={promo} />
                    <EditPromoCodeDialog promo={promo} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleToggleStatus}>
                                {promo.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={handleDelete}
                                className="text-red-600"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
    );
}

function ViewPromoCodeDialog({ promo }: { promo: PromoCode }) {
    const [open, setOpen] = useState(false);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Promo Code Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Code</label>
                            <p className="font-mono font-medium text-lg">{promo.code}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <div className="mt-1">
                                {promo.is_active ? (
                                    <Badge variant="default">Active</Badge>
                                ) : (
                                    <Badge variant="destructive">Inactive</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="mt-1">{promo.description || 'No description'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Discount Type</label>
                            <p className="mt-1 capitalize">{promo.discount_type}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Discount Value</label>
                            <p className="mt-1">
                                {promo.discount_type === 'fixed' ? '$' : ''}
                                {promo.discount_value}
                                {promo.discount_type === 'percentage' ? '%' : ''}
                            </p>
                        </div>
                    </div>

                    {promo.max_discount && promo.discount_type === 'percentage' && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Maximum Discount</label>
                            <p className="mt-1">${promo.max_discount}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Minimum Order</label>
                            <p className="mt-1">${promo.min_order_amount}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Usage</label>
                            <p className="mt-1">{promo.used_count} / {promo.usage_limit}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Valid From</label>
                            <p className="mt-1">{formatDate(promo.valid_from)}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
                            <p className="mt-1">{formatDate(promo.valid_until)}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Code Type</label>
                        <p className="mt-1">
                            {promo.is_public ? 'Public' : 'Personalized'}
                            {!promo.is_public && promo.PromoCodeRequest && (
                                <span className="text-muted-foreground ml-2">
                                    (For {promo.PromoCodeRequest.first_name} {promo.PromoCodeRequest.last_name})
                                </span>
                            )}
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                        <p className="mt-1">{formatDate(promo.created_at)}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function EditPromoCodeDialog({ promo }: { promo: PromoCode }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value.toString(),
        max_discount: promo.max_discount?.toString() || '',
        min_order_amount: promo.min_order_amount.toString(),
        usage_limit: promo.usage_limit.toString(),
        valid_from: new Date(promo.valid_from).toISOString().split('T')[0],
        valid_until: new Date(promo.valid_until).toISOString().split('T')[0],
        is_public: promo.is_public,
        is_active: promo.is_active
    });
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.put(`/promo/admin/promo-codes/${promo.id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
            toast.success("Promo code updated successfully");
            setOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update promo code");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData = {
            ...formData,
            discount_value: parseFloat(formData.discount_value),
            max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
            min_order_amount: parseFloat(formData.min_order_amount) || 0,
            usage_limit: parseInt(formData.usage_limit),
            valid_from: new Date(formData.valid_from).toISOString(),
            valid_until: new Date(formData.valid_until).toISOString()
        };

        updateMutation.mutate(submitData);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Promo Code</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="edit-code" className="text-sm font-medium">
                                Code *
                            </label>
                            <Input
                                id="edit-code"
                                value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                placeholder="Promo code"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="edit-discount_type" className="text-sm font-medium">
                                Discount Type *
                            </label>
                            <select
                                id="edit-discount_type"
                                value={formData.discount_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'fixed' | 'percentage' }))}
                                className="w-full p-2 border rounded-md"
                                required
                            >
                                <option value="fixed">Fixed Amount</option>
                                <option value="percentage">Percentage</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="edit-discount_value" className="text-sm font-medium">
                                Discount Value *
                            </label>
                            <Input
                                id="edit-discount_value"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.discount_value}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                                placeholder={formData.discount_type === 'fixed' ? '0.00' : '0'}
                                required
                            />
                        </div>

                        {formData.discount_type === 'percentage' && (
                            <div className="space-y-2">
                                <label htmlFor="edit-max_discount" className="text-sm font-medium">
                                    Max Discount
                                </label>
                                <Input
                                    id="edit-max_discount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.max_discount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_discount: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="edit-min_order_amount" className="text-sm font-medium">
                                Min Order Amount
                            </label>
                            <Input
                                id="edit-min_order_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.min_order_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="edit-usage_limit" className="text-sm font-medium">
                                Usage Limit *
                            </label>
                            <Input
                                id="edit-usage_limit"
                                type="number"
                                min="1"
                                value={formData.usage_limit}
                                onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="edit-valid_from" className="text-sm font-medium">
                                Valid From *
                            </label>
                            <Input
                                id="edit-valid_from"
                                type="date"
                                value={formData.valid_from}
                                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="edit-valid_until" className="text-sm font-medium">
                                Valid Until *
                            </label>
                            <Input
                                id="edit-valid_until"
                                type="date"
                                value={formData.valid_until}
                                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="edit-description" className="text-sm font-medium">
                            Description
                        </label>
                        <Textarea
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full"
                            rows={3}
                            placeholder="Promo code description..."
                        />
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="edit-is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="edit-is_active" className="text-sm font-medium">
                                Active
                            </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="edit-is_public"
                                checked={formData.is_public}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="edit-is_public" className="text-sm font-medium">
                                Public Code
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Updating..." : "Update Promo Code"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddPromoCodeDialog() {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'fixed' as 'fixed' | 'percentage',
        discount_value: '',
        max_discount: '',
        min_order_amount: '0',
        usage_limit: '1',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_public: true,
        customer_uid: '',
        is_active: true
    });
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/promo/admin/promo-codes", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
            toast.success("Promo code created successfully");
            setOpen(false);
            setFormData({
                code: '',
                description: '',
                discount_type: 'fixed',
                discount_value: '',
                max_discount: '',
                min_order_amount: '0',
                usage_limit: '1',
                valid_from: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                is_public: true,
                customer_uid: '',
                is_active: true
            });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to create promo code");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData = {
            ...formData,
            discount_value: parseFloat(formData.discount_value),
            max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
            min_order_amount: parseFloat(formData.min_order_amount) || 0,
            usage_limit: parseInt(formData.usage_limit),
            valid_from: new Date(formData.valid_from).toISOString(),
            valid_until: new Date(formData.valid_until).toISOString(),
            customer_uid: formData.is_public ? null : formData.customer_uid
        };

        createMutation.mutate(submitData);
    };

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, code }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Promo Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Promo Code</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="code" className="text-sm font-medium">
                                Code *
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="Promo code"
                                    required
                                />
                                <Button type="button" variant="outline" onClick={generateCode}>
                                    Generate
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="discount_type" className="text-sm font-medium">
                                Discount Type *
                            </label>
                            <select
                                id="discount_type"
                                value={formData.discount_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'fixed' | 'percentage' }))}
                                className="w-full p-2 border rounded-md"
                                required
                            >
                                <option value="fixed">Fixed Amount</option>
                                <option value="percentage">Percentage</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="discount_value" className="text-sm font-medium">
                                Discount Value *
                            </label>
                            <Input
                                id="discount_value"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.discount_value}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                                placeholder={formData.discount_type === 'fixed' ? '0.00' : '0'}
                                required
                            />
                        </div>

                        {formData.discount_type === 'percentage' && (
                            <div className="space-y-2">
                                <label htmlFor="max_discount" className="text-sm font-medium">
                                    Max Discount
                                </label>
                                <Input
                                    id="max_discount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.max_discount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_discount: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="min_order_amount" className="text-sm font-medium">
                                Min Order Amount
                            </label>
                            <Input
                                id="min_order_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.min_order_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="usage_limit" className="text-sm font-medium">
                                Usage Limit *
                            </label>
                            <Input
                                id="usage_limit"
                                type="number"
                                min="1"
                                value={formData.usage_limit}
                                onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="valid_from" className="text-sm font-medium">
                                Valid From *
                            </label>
                            <Input
                                id="valid_from"
                                type="date"
                                value={formData.valid_from}
                                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="valid_until" className="text-sm font-medium">
                                Valid Until *
                            </label>
                            <Input
                                id="valid_until"
                                type="date"
                                value={formData.valid_until}
                                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Code Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={formData.is_public}
                                   
                                />
                                Public (Anyone can use)
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={!formData.is_public}
                                />
                                Personalized (Specific customer)
                            </label>
                        </div>
                    </div>

                    {!formData.is_public && (
                        <div className="space-y-2">
                            <label htmlFor="customer_uid" className="text-sm font-medium">
                                Customer UID
                            </label>
                            <Input
                                id="customer_uid"
                                value={formData.customer_uid}
                                onChange={(e) => setFormData(prev => ({ ...prev, customer_uid: e.target.value }))}
                                placeholder="Enter customer UID"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                            Description
                        </label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full"
                            rows={3}
                            placeholder="Promo code description..."
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium">
                            Activate promo code immediately
                        </label>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? "Creating..." : "Create Promo Code"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}