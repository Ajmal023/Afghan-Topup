import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Search, 
    MoreVertical, 
    Eye, 
    Users, 
    DollarSign, 
    Calendar,
    Tag,
    ArrowUpDown,
    Filter,
    Download
} from "lucide-react";
import { toast } from "sonner";

interface PromoUse {
    id: string;
    promo_code_id: string;
    customer_uid: string;
    transaction_id: string | null;
    original_amount: number;
    discount_amount: number;
    final_amount: number;
    status: 'pending' | 'used' | 'failed';
    applied: boolean;
    createdAt: string;
    updatedAt: string;
    PromoCode?: {
        id: string;
        code: string;
        description: string;
        discount_type: 'fixed' | 'percentage';
        discount_value: number;
        is_public: boolean;
        customer_uid: string | null;
    };
    Customer?: {
        uid: string;
        first_name: string;
        last_name: string;
        email: string;
        whatsapp_number: string;
    };
    Transaction?: {
        id: string;
        phone_number: string;
        amount: number;
        status: string;
        createdAt: string;
    };
}

interface PromoUsesResponse {
    data: {
        rows: PromoUse[];
        count: number;
    };
    meta: {
        page: number;
        limit: number;
        count: number;
    };
}

export default function PromoUsesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [sortField, setSortField] = useState<string>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [filteredUses, setFilteredUses] = useState<PromoUse[]>([]);

    const { data: promoUsesResponse, isLoading, error } = useQuery<PromoUsesResponse>({
        queryKey: ["admin-promo-uses"],
        queryFn: async () => {
            const response = await api.get("/promo/admin/promo-uses");
            return response.data;
        },
    });

    const promoUses = promoUsesResponse?.data?.rows || [];


    const totalUses = promoUses.length;
    const successfulUses = promoUses.filter(u => u.status === 'used').length;
    const failedUses = promoUses.filter(u => u.status === 'failed').length;
    

    const totalDiscount = promoUses.reduce((sum, use) => {
        const discount = use.discount_amount || 0;
        return sum + (typeof discount === 'number' ? discount : 0);
    }, 0);


    useEffect(() => {
        if (promoUses) {
            let filtered = promoUses.filter(use => {
                const matchesSearch = 
                    use.PromoCode?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    use.Customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    use.Customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    use.Customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    use.Customer?.whatsapp_number?.includes(searchTerm);

                const matchesStatus = statusFilter === "all" || use.status === statusFilter;

          
                let matchesDate = true;
                if (dateFilter !== "all") {
                    const useDate = new Date(use.createdAt);
                    const now = new Date();
                    
                    switch (dateFilter) {
                        case "today":
                            matchesDate = useDate.toDateString() === now.toDateString();
                            break;
                        case "week":
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            matchesDate = useDate >= weekAgo;
                            break;
                        case "month":
                            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            matchesDate = useDate >= monthAgo;
                            break;
                    }
                }

                return matchesSearch && matchesStatus && matchesDate;
            });


            filtered = filtered.sort((a, b) => {
                let aValue: any = a;
                let bValue: any = b;
                
        
                if (sortField.includes('.')) {
                    const fields = sortField.split('.');
                    aValue = fields.reduce((obj, field) => obj?.[field], a);
                    bValue = fields.reduce((obj, field) => obj?.[field], b);
                } else {
                    aValue = a[sortField as keyof PromoUse];
                    bValue = b[sortField as keyof PromoUse];
                }

         
                if (aValue == null) aValue = '';
                if (bValue == null) bValue = '';

                if (sortOrder === "asc") {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });

            setFilteredUses(filtered);
        }
    }, [promoUses, searchTerm, statusFilter, dateFilter, sortField, sortOrder]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'used':
                return <Badge variant="default">Used</Badge>;
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    const exportToCSV = () => {
        const headers = [
            'Code',
            'Customer',
            'Email',
            'WhatsApp',
            'Original Amount',
            'Discount',
            'Final Amount',
            'Status',
            'Date Used'
        ];

        const csvData = filteredUses.map(use => [
            use.PromoCode?.code || 'N/A',
            `${use.Customer?.first_name || ''} ${use.Customer?.last_name || ''}`.trim() || 'Unknown',
            use.Customer?.email || 'N/A',
            use.Customer?.whatsapp_number || 'N/A',
            `$${Number(use.original_amount || 0).toFixed(2)}`,
            `$${Number(use.discount_amount || 0).toFixed(2)}`,
            `$${Number(use.final_amount || 0).toFixed(2)}`,
            use.status,
            new Date(use.createdAt).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `promo-uses-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        toast.success("Data exported to CSV");
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Tag className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading Promo Uses</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load promo uses. Please try again."}
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
                    <h1 className="text-3xl font-bold">Promo Code Usage</h1>
                </div>
                <Button onClick={exportToCSV} variant="outline" disabled={filteredUses.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

    
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Uses</p>
                                <p className="text-2xl font-bold">{totalUses}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                                <p className="text-2xl font-bold">{successfulUses}</p>
                            </div>
                            <Badge variant="default" className="h-6 w-6 bg-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Discount</p>
                                <p className="text-2xl font-bold">
                                    ${typeof totalDiscount === 'number' ? totalDiscount.toFixed(2) : '0.00'}
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
                                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                                <p className="text-2xl font-bold">{failedUses}</p>
                            </div>
                            <Badge variant="destructive" className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

 
     
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>Promo Code Usage History</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by code, customer, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="p-2 border rounded-md text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="used">Used</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="p-2 border rounded-md text-sm"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead 
                                        className="cursor-pointer"
                                        onClick={() => handleSort('PromoCode.code')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Code
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead 
                                        className="cursor-pointer"
                                        onClick={() => handleSort('discount_amount')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Discount
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Amounts</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead 
                                        className="cursor-pointer"
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Date Used
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && filteredUses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {promoUses.length > 0 ? 'No promo uses match your filters' : 'No promo uses found'}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {filteredUses.map((use) => (
                                    <PromoUseTableRow key={use.id} use={use} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
        
        </div>
    );
}

function PromoUseTableRow({ use }: { use: PromoUse }) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const discountAmount = Number(use.discount_amount || 0);
    const originalAmount = Number(use.original_amount || 0);
    const finalAmount = Number(use.final_amount || 0);

    return (
        <TableRow key={use.id}>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-mono font-medium">{use.PromoCode?.code || 'N/A'}</span>
                    {use.PromoCode?.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-xs">
                            {use.PromoCode.description}
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                {use.Customer ? (
                    <div className="flex flex-col">
                        <span className="font-medium">
                            {use.Customer.first_name} {use.Customer.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {use.Customer.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {use.Customer.whatsapp_number}
                        </span>
                    </div>
                ) : (
                    <span className="text-muted-foreground">Unknown Customer</span>
                )}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 text-green-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">
                        {discountAmount.toFixed(2)}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-sm">
                    <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Original:</span>
                        <span>${originalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Final:</span>
                        <span className="font-medium">
                            ${finalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                {use.status === 'used' && <Badge variant="default">Used</Badge>}
                {use.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                {use.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                {use.applied && (
                    <div className="text-xs text-muted-foreground mt-1">Applied</div>
                )}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3" />
                    {formatDate(use.createdAt)}
                </div>
            </TableCell>
            <TableCell className="text-right">
                <ViewPromoUseDialog use={use} />
            </TableCell>
        </TableRow>
    );
}

function ViewPromoUseDialog({ use }: { use: PromoUse }) {
    const [open, setOpen] = useState(false);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const discountAmount = Number(use.discount_amount || 0);
    const originalAmount = Number(use.original_amount || 0);
    const finalAmount = Number(use.final_amount || 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Promo Code Usage Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Promo Code</label>
                            <p className="font-mono font-medium">{use.PromoCode?.code || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Code Type</label>
                            <p className="capitalize">
                                {use.PromoCode?.is_public ? 'Public' : 'Personalized'}
                            </p>
                        </div>
                    </div>

                    {use.PromoCode?.description && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <p className="mt-1">{use.PromoCode.description}</p>
                        </div>
                    )}


                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Customer</label>
                        {use.Customer ? (
                            <div className="mt-1 space-y-1">
                                <p>
                                    {use.Customer.first_name} {use.Customer.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{use.Customer.email}</p>
                                <p className="text-sm text-muted-foreground">{use.Customer.whatsapp_number}</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Unknown Customer</p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Original Amount</label>
                            <p className="text-lg font-medium">${originalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Discount</label>
                            <p className="text-lg font-medium text-green-600">
                                -${discountAmount.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Final Amount</label>
                            <p className="text-lg font-bold">${finalAmount.toFixed(2)}</p>
                        </div>
                    </div>

           
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <div className="mt-1">
                                {use.status === 'used' && <Badge variant="default">Used</Badge>}
                                {use.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                                {use.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Applied</label>
                            <p className="mt-1">{use.applied ? 'Yes' : 'No'}</p>
                        </div>
                    </div>

             
                    {use.Transaction && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Transaction</label>
                            <div className="mt-1 space-y-1">
                                <p className="text-sm">ID: {use.Transaction.id}</p>
                                <p className="text-sm">Phone: {use.Transaction.phone_number}</p>
                                <p className="text-sm">Status: {use.Transaction.status}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Used At</label>
                            <p className="text-sm">{formatDate(use.createdAt)}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                            <p className="text-sm">{formatDate(use.updatedAt)}</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}