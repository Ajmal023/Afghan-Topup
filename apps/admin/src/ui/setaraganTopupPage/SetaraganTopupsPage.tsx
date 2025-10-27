import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
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
    Search, Filter,  DollarSign,  Eye, 
    Download,  Users, Phone,  Database,
    TrendingUp, Wallet, PieChart
} from "lucide-react";

interface SetaraganTopup {
    id: string;
    transaction_id: string;
    customer_mobile: string;
    uid: string;
    amount: number;
    txn_id: string;
    status: string;
    current_balance: number;
    previous_balance: number;
    request_id: string;
    commission: number;
    message: string;
    operator_id: string;
    msisdn: string;
    createdAt: string;
    Transaction?: {
        id: string;
        payment_id?: string;
        original_amount?: number;
        discount_amount?: number;
        promo_code?: string;
    };
}

interface SetaraganStats {
    total: number;
    totalAmount: number;
    totalCommission: number;
    successRate: number;
    currentBalance: number;
    byStatus: {
        [key: string]: {
            count: number;
            amount: number;
        };
    };
}

interface SetaraganTopupsResponse {
    data: SetaraganTopup[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export default function SetaraganTopupsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [customerMobile, setCustomerMobile] = useState("");
    const [uid, setUid] = useState("");
    const [page, setPage] = useState(1);


    useEffect(() => {
        setStartDate("");
        setEndDate("");
    }, []);

    const { data: topupsResponse, isLoading, error } = useQuery<SetaraganTopupsResponse>({
        queryKey: ["setaragan-topups", page, searchTerm, selectedStatus, startDate, endDate, customerMobile, uid],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(searchTerm && { search: searchTerm }),
                ...(selectedStatus !== "all" && { status: selectedStatus }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(customerMobile && { customer_mobile: customerMobile }),
                ...(uid && { uid })
            });
            
            const response = await api.get(`/admin/setaragan-topups/admin/setaragan-topups?${params}`);
            return response.data;
        },
    });

    const { data: stats } = useQuery<SetaraganStats>({
        queryKey: ["setaragan-stats", startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/setaragan-topups/admin/setaragan-topups/stats?${params}`);
            return response.data.data;
        },
    });

    const topups = topupsResponse?.data || [];
    const pagination = topupsResponse?.pagination;

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        setCustomerMobile("");
        setUid("");
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
        setPage(1);
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/setaragan-topups/admin/setaragan-topups/export?${params}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `setaragan-topups-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("Export completed successfully");
        } catch (error) {
            toast.error("Failed to export data");
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Database className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading Setaragan Topups</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load topups. Please try again."}
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
                    <Database className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">Setaragan Topups</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Topups</p>
                                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                                <p className="text-2xl font-bold">{stats?.totalAmount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                                 <p className="text-2xl font-bold">
                    {stats?.currentBalance !== null && stats?.currentBalance !== undefined 
                        ? `${Number(stats.currentBalance).toFixed(2)}`
                        : '$0.00'
                    }
                </p>
                            </div>
                            <Wallet className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                <p className="text-2xl font-bold">{stats?.successRate?.toFixed(1) || 0}%</p>
                            </div>
                            <PieChart className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

 
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search topups..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="p-2 border rounded-md"
                        >
                            <option value="all">All Status</option>
                            <option value="Success">Success</option>
                            <option value="Failed">Failed</option>
                            <option value="Pending">Pending</option>
                        </select>

                        <Input
                            placeholder="Customer Mobile"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                        />

                        <Input
                            placeholder="UID"
                            value={uid}
                            onChange={(e) => setUid(e.target.value)}
                        />

                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                            />
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                        <Button 
                            variant="outline" 
                            onClick={clearFilters}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Clear Filters
                        </Button>
                        
                        <div className="text-sm text-muted-foreground">
                            Showing {topups.length} of {pagination?.totalItems || 0} topups
                        </div>
                    </div>
                </CardContent>
            </Card>


   
                <CardHeader>
                    <CardTitle>Topup History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>TXN ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Current Balance</TableHead>
                                    <TableHead>Request ID</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && topups.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                            No topups found
                                        </TableCell>
                                    </TableRow>
                                )}

                                {topups.map((topup) => (
                                    <TopupTableRow key={topup.id} topup={topup} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>

               
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                                {pagination.totalItems} entries
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(pagination.currentPage - 1)}
                                    disabled={!pagination.hasPrevPage}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(pagination.currentPage + 1)}
                                    disabled={!pagination.hasNextPage}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
         
        </div>
    );
}

function TopupTableRow({ topup }: { topup: SetaraganTopup }) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Success':
                return <Badge variant="default" className="bg-green-500">Success</Badge>;
            case 'Failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'Pending':
                return <Badge variant="secondary">Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <TableRow key={topup.id}>
            <TableCell className="font-mono text-xs">
                {topup.transaction_id.slice(-8)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{topup.uid}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{topup.customer_mobile}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
     
                    <span className="font-medium">{topup.amount}</span>
                </div>
                {topup.Transaction?.discount_amount && topup.Transaction.discount_amount > 0 && (
                    <div className="text-xs text-muted-foreground">
                        Original: ${topup.Transaction.original_amount}
                    </div>
                )}
            </TableCell>
            <TableCell className="font-mono text-xs">
                {topup.txn_id}
            </TableCell>
            <TableCell>{getStatusBadge(topup.status)}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-purple-500" />
                    <span>{topup.current_balance}</span>
                </div>
            </TableCell>
            <TableCell className="font-mono text-xs">
                {topup.request_id.slice(-8)}
            </TableCell>
            <TableCell className="text-sm">
                {formatDate(topup.createdAt)}
            </TableCell>
            <TableCell className="text-right">
                <TopupDetailsDialog topup={topup} />
            </TableCell>
        </TableRow>
    );
}

function TopupDetailsDialog({ topup }: { topup: SetaraganTopup }) {
    const [open, setOpen] = useState(false);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Setaragan Topup Details</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                                    <p className="font-mono text-sm">{topup.transaction_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">TXN ID</label>
                                    <p className="font-mono text-sm">{topup.txn_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Customer UID</label>
                                    <p>{topup.uid}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                    <p>{topup.customer_mobile}</p>
                                </div>
                                <div>
                                 
                                    <p className="text-lg font-bold">{topup.amount}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        {topup.status === 'Success' ? (
                                            <Badge variant="default" className="bg-green-500">Success</Badge>
                                        ) : topup.status === 'Failed' ? (
                                            <Badge variant="destructive">Failed</Badge>
                                        ) : (
                                            <Badge variant="secondary">{topup.status}</Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                   
                                    <p className="text-lg font-bold">{topup.current_balance}</p>
                                </div>
                                <div>
                                  
                                    <p>{topup.previous_balance || '0.00'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Commission</label>
                                    <p>${topup.commission}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                                    <p className="font-mono text-sm">{topup.request_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Operator ID</label>
                                    <p>{topup.operator_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">MSISDN</label>
                                    <p>{topup.msisdn}</p>
                                </div>
                            </div>
                            
                            {topup.Transaction?.promo_code && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <h4 className="font-medium text-blue-800">Promo Code Applied</h4>
                                    <p className="text-sm text-blue-700">
                                        Code: {topup.Transaction.promo_code} 
                                        {topup.Transaction.discount_amount && ` - Discount: $${topup.Transaction.discount_amount}`}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {topup.message && (
                        <div>
                            <CardHeader>
                                <CardTitle>API Response Message</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{topup.message}</p>
                            </CardContent>
                        </div>
                    )}

             
                    <div>
                        <CardHeader>
                            <CardTitle>Timestamps</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium">Created At:</span>
                                    <span className="text-sm text-muted-foreground">{formatDate(topup.createdAt)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}