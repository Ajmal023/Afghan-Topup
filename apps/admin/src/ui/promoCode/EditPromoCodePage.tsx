// src/pages/admin/EditPromoCodePage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EditPromoCodePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'fixed' as 'fixed' | 'percentage',
        discount_value: '',
        max_discount: '',
        min_order_amount: '',
        usage_limit: '',
        valid_from: '',
        valid_until: '',
        is_active: true,
        is_public: true,
    });

    const { data: promoCode, isLoading, error } = useQuery({
        queryKey: ["promo-code", id],
        queryFn: async () => {
            const response = await api.get(`/promo/admin/promo-codes/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });

    useEffect(() => {
        if (promoCode) {
            setFormData({
                code: promoCode.code,
                description: promoCode.description || '',
                discount_type: promoCode.discount_type,
                discount_value: promoCode.discount_value.toString(),
                max_discount: promoCode.max_discount?.toString() || '',
                min_order_amount: promoCode.min_order_amount.toString(),
                usage_limit: promoCode.usage_limit.toString(),
                valid_from: new Date(promoCode.valid_from).toISOString().split('T')[0],
                valid_until: new Date(promoCode.valid_until).toISOString().split('T')[0],
                is_active: promoCode.is_active,
                is_public: promoCode.is_public,
            });
        }
    }, [promoCode]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.put(`/promo/admin/promo-codes/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success("Promo code updated successfully");
            navigate("/admin/promo-codes");
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
            min_order_amount: parseFloat(formData.min_order_amount),
            usage_limit: parseInt(formData.usage_limit),
            valid_from: new Date(formData.valid_from).toISOString(),
            valid_until: new Date(formData.valid_until).toISOString(),
        };

        updateMutation.mutate(submitData);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">Error loading promo code: {error.message}</p>
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
                    <Tag className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">Edit Promo Code</h1>
                </div>
            </div>

            {/* Edit Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Promo Code Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="code" className="text-sm font-medium">
                                    Code *
                                </label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    required
                                />
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
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    />
                                    Active
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_public}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                                    />
                                    Public
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium">
                                Description
                            </label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => navigate("/admin/promo-codes")}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? "Updating..." : "Update Promo Code"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}