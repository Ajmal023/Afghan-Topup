// src/pages/admin/PromoRequestsPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import { Search, Users, Calendar, Mail, Phone, FileText, MoreVertical, Check, X } from "lucide-react";

interface PromoRequest {
    id: string;
    customer_uid: string;
    first_name: string;
    last_name: string;
    whatsapp_number: string;
    email: string;
    profile_image: string | null;
    id_document: string | null;
    address: string | null;
    facebook_link: string | null;
    tiktok_link: string | null;
    instagram_link: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes: string | null;
    handled_by: string | null;
    handled_at: string | null;
    created_at: string;
    CustomerProfile?: {
        profile_image: string;
    };
}

export default function PromoRequestsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredRequests, setFilteredRequests] = useState<PromoRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const { data: requests, isLoading, error } = useQuery<PromoRequest[]>({
        queryKey: ["admin-promo-requests", statusFilter],
        queryFn: async () => {
            const response = await api.get(`/promo/admin/promo-requests?status=${statusFilter}`);
            return response.data.data.rows;
        },
    });

    useEffect(() => {
        if (requests) {
            const filtered = requests.filter(request => 
                `${request.first_name} ${request.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.whatsapp_number.includes(searchTerm)
            );
            setFilteredRequests(filtered);
        }
    }, [requests, searchTerm]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline">Pending</Badge>;
            case 'approved': return <Badge variant="default">Approved</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="outline">Unknown</Badge>;
        }
    };

    return (
        <div className="space-y-6">
      
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">Promo Code Requests</h1>
                </div>
            </div>

   
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search requests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant={statusFilter === 'all' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setStatusFilter('all')}
                            >
                                All
                            </Button>
                            <Button 
                                variant={statusFilter === 'pending' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setStatusFilter('pending')}
                            >
                                Pending
                            </Button>
                            <Button 
                                variant={statusFilter === 'approved' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setStatusFilter('approved')}
                            >
                                Approved
                            </Button>
                            <Button 
                                variant={statusFilter === 'rejected' ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setStatusFilter('rejected')}
                            >
                                Rejected
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

     
  
                <CardHeader>
                    <CardTitle>Promo Code Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {error && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-red-500">
                                            Error loading requests
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && !error && filteredRequests.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No requests found
                                        </TableCell>
                                    </TableRow>
                                )}

                                {filteredRequests.map((request) => (
                                    <RequestTableRow key={request.id} request={request} getStatusBadge={getStatusBadge} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
        
        </div>
    );
}

function RequestTableRow({ request, getStatusBadge }: { request: PromoRequest; getStatusBadge: (status: string) => JSX.Element }) {
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [promoDialogOpen, setPromoDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
    const [adminNotes, setAdminNotes] = useState('');
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            await api.put(`/promo/admin/promo-requests/${id}`, { status, admin_notes: notes });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-promo-requests"] });
            
            if (variables.status === 'approved') {
                // Open promo creation form instead of showing success message
                setPromoDialogOpen(true);
            } else {
                toast.success(`Request ${variables.status} successfully`);
            }
            setActionDialogOpen(false);
            setAdminNotes('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update request");
        },
    });

    const handleAction = (type: 'approve' | 'reject') => {
        setActionType(type);
        setActionDialogOpen(true);
    };

    const submitAction = () => {
        updateMutation.mutate({ 
            id: request.id, 
            status: actionType === 'approve' ? 'approved' : 'rejected',
            notes: adminNotes 
        });
    };

    return (
        <>
            <TableRow key={request.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        {request.CustomerProfile?.profile_image ? (
                            <img 
                                src={request.CustomerProfile.profile_image} 
                                alt={request.first_name}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-500" />
                            </div>
                        )}
                        <div>
                            <div className="font-medium">{request.first_name} {request.last_name}</div>
                            <div className="text-sm text-muted-foreground">{request.customer_uid}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">{request.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">{request.whatsapp_number}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                    </div>
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewDialogOpen(true)}
                        >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                        </Button>
                        
                        {request.status === 'pending' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleAction('approve')}>
                                        <Check className="h-4 w-4 mr-2" />
                                        Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAction('reject')}>
                                        <X className="h-4 w-4 mr-2" />
                                        Reject
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </TableCell>
            </TableRow>

            {/* View Details Dialog - Keep this as is */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                        <DialogDescription>
                            Customer promo code request information
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Name</label>
                                <p className="text-sm">{request.first_name} {request.last_name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Customer UID</label>
                                <p className="text-sm font-mono">{request.customer_uid}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <p className="text-sm">{request.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">WhatsApp</label>
                                <p className="text-sm">{request.whatsapp_number}</p>
                            </div>
                        </div>

                        {request.address && (
                            <div>
                                <label className="text-sm font-medium">Address</label>
                                <p className="text-sm">{request.address}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            {request.facebook_link && (
                                <div>
                                    <label className="text-sm font-medium">Facebook</label>
                                    <p className="text-sm truncate">{request.facebook_link}</p>
                                </div>
                            )}
                            {request.tiktok_link && (
                                <div>
                                    <label className="text-sm font-medium">TikTok</label>
                                    <p className="text-sm truncate">{request.tiktok_link}</p>
                                </div>
                            )}
                            {request.instagram_link && (
                                <div>
                                    <label className="text-sm font-medium">Instagram</label>
                                    <p className="text-sm truncate">{request.instagram_link}</p>
                                </div>
                            )}
                        </div>

                        {request.id_document && (
                            <div>
                                <label className="text-sm font-medium">ID Document</label>
                                <div className="mt-2">
                                    <img 
                                        src={request.id_document} 
                                        alt="ID Document"
                                        className="max-w-full h-auto rounded border"
                                    />
                                </div>
                            </div>
                        )}

                        {request.admin_notes && (
                            <div>
                                <label className="text-sm font-medium">Admin Notes</label>
                                <p className="text-sm bg-gray-50 p-2 rounded">{request.admin_notes}</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Action Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve' 
                                ? 'You will be able to create a personalized promo code for this customer after approval.' 
                                : 'The customer will be notified about the rejection.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="adminNotes" className="text-sm font-medium">
                                Admin Notes
                            </label>
                            <Textarea
                                id="adminNotes"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes about this decision..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setActionDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant={actionType === 'approve' ? 'default' : 'destructive'}
                            onClick={submitAction}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Processing...' : 
                             actionType === 'approve' ? 'Approve & Create Promo' : 'Reject Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Promo Code Creation Dialog */}
            <PromoCodeCreationDialog 
                open={promoDialogOpen}
                onOpenChange={setPromoDialogOpen}
                request={request}
            />
        </>
    );
}

function PromoCodeCreationDialog({ 
    open, 
    onOpenChange, 
    request 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    request: PromoRequest;
}) {
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage' as 'fixed' | 'percentage',
        discount_value: '10',
        max_discount: '5',
        min_order_amount: '0',
        usage_limit: '1',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_public: false,
        is_active: true
    });
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post(`/promo/admin/promo-requests/${request.id}/create-promo`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-promo-requests"] });
            queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
            toast.success("Promo code created successfully");
            onOpenChange(false);
            setFormData({
                code: '',
                description: '',
                discount_type: 'percentage',
                discount_value: '10',
                max_discount: '5',
                min_order_amount: '0',
                usage_limit: '1',
                valid_from: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                is_public: false,
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
            description: formData.description || `Personalized promo code for ${request.first_name} ${request.last_name}`
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Promo Code for {request.first_name} {request.last_name}</DialogTitle>
                    <DialogDescription>
                        Create a personalized promo code for customer: {request.customer_uid}
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800">Customer Information</h4>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                            <div>
                                <span className="font-medium">Name:</span> {request.first_name} {request.last_name}
                            </div>
                            <div>
                                <span className="font-medium">Email:</span> {request.email}
                            </div>
                            <div>
                                <span className="font-medium">WhatsApp:</span> {request.whatsapp_number}
                            </div>
                            <div>
                                <span className="font-medium">UID:</span> {request.customer_uid}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="code" className="text-sm font-medium">
                                Promo Code *
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="Enter promo code"
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
                        <label htmlFor="description" className="text-sm font-medium">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border rounded-md"
                            rows={3}
                            placeholder={`Personalized promo code for ${request.first_name} ${request.last_name}`}
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
                            onClick={() => onOpenChange(false)}
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