import { useState } from "react";
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
import { 
    Search, Filter, Calendar, DollarSign, RefreshCw, Eye, 
    Play, CheckCircle, XCircle, Clock, MoreVertical, 
    Download, BarChart3, Users, Phone, CreditCard,
    AlertCircle, Server, User, Hash, Calendar as CalendarIcon,
    Smartphone, Globe, Tag, Package, Network
} from "lucide-react";

interface Transaction {
    id: string;
    amount: number;
    value: number;
    phone_number: string;
    uid: string;
    status: 'Pending' | 'Paid' | 'Confirmed' | 'Rejected' | 'Failed';
    stripe_status?: string;
    payment_id?: string;
    original_amount?: number;
    discount_amount?: number;
    promo_code?: string;
    promo_code_id?: string;
    output: number;
    currency: string;
    network: string;
    is_checked: boolean;
    createdAt: string;
    updatedAt: string;
    ApiSataragans?: Array<{
        id: string;
        status: string;
        message: string;
        txn_id: string;
        commission?: number;
        api_txn_id?: string;
        request_id?: string;
        createdAt: string;
    }>;
    PromoUses?: Array<{
        id?: string;
        status?: string;
        applied?: boolean;
        original_amount?: number;
        discount_amount?: number;
        final_amount?: number;
        PromoCode?: {
            code: string;
            discount_type: string;
            discount_value: number;
            description?: string;
        };
    }>;
}

interface TransactionStats {
    total: number;
    totalAmount: number;
    successRate: number;
    byStatus: {
        [key: string]: {
            count: number;
            amount: number;
        };
    };
}

interface TransactionsResponse {
    data: Transaction[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export default function TransactionsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
    const [page, setPage] = useState(1);

    const { data: transactionsResponse, isLoading, error } = useQuery<TransactionsResponse>({
        queryKey: ["admin-transactions", page, searchTerm, selectedStatus, startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(searchTerm && { search: searchTerm }),
                ...(selectedStatus !== "all" && { status: selectedStatus }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate })
            });
            
            const response = await api.get(`/admin/trans/admin/transactions?${params}`);
            return response.data;
        },
    });

    const { data: stats } = useQuery<TransactionStats>({
        queryKey: ["admin-transactions-stats", startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/trans/admin/transactions/stats?${params}`);
            return response.data.data;
        },
    });

    const transactions = transactionsResponse?.data || [];
    const pagination = transactionsResponse?.pagination;

    const queryClient = useQueryClient();

    const retryMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/transactions/admin/transactions/${id}/retry-sataragan`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["admin-transactions-stats"] });
            toast.success("Transaction retry initiated");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to retry transaction");
        },
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ transactionIds, status }: { transactionIds: string[]; status: string }) => {
            const response = await api.post('/transactions/admin/transactions/bulk-update', {
                transactionIds,
                status
            });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["admin-transactions-stats"] });
            toast.success(data.message);
            setSelectedTransactions([]);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update transactions");
        },
    });

    const handleRetry = (id: string) => {
        if (window.confirm("Are you sure you want to retry this transaction?")) {
            retryMutation.mutate(id);
        }
    };

    const handleBulkUpdate = (status: string) => {
        if (selectedTransactions.length === 0) return;
        
        if (window.confirm(`Are you sure you want to mark ${selectedTransactions.length} transactions as ${status}?`)) {
            bulkUpdateMutation.mutate({ transactionIds: selectedTransactions, status });
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        setStartDate("");
        setEndDate("");
        setSelectedTransactions([]);
        setPage(1);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Confirmed':
                return <Badge variant="default" className="bg-green-500">Confirmed</Badge>;
            case 'Paid':
                return <Badge variant="default" className="bg-blue-500">Paid</Badge>;
            case 'Pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'Failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'Rejected':
                return <Badge variant="outline" className="border-red-200 text-red-700">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getStripeStatusBadge = (stripeStatus: string) => {
        switch (stripeStatus) {
            case 'succeeded':
                return <Badge variant="default" className="bg-green-500">Succeeded</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'processing':
                return <Badge variant="secondary">Processing</Badge>;
            case 'requires_payment_method':
                return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Requires Payment</Badge>;
            default:
                return <Badge variant="outline">{stripeStatus || 'N/A'}</Badge>;
        }
    };

    const getOutputBadge = (output: number) => {
        switch (output) {
            case 1:
                return <Badge variant="outline" className="bg-blue-50 text-blue-700">Internal</Badge>;
            case 2:
                return <Badge variant="outline" className="bg-green-50 text-green-700">Sataragan</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };


    const shouldShowRetry = (transaction: Transaction) => {
        if (transaction.status === 'Paid' || transaction.status === 'Confirmed') {
            return false;
        }
        if (transaction.status === 'Failed' && transaction.output === 1) {
            return true;
        }
        if (transaction.status === 'Pending') {
            return true;
        }
        return false;
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <CreditCard className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading Transactions</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load transactions. Please try again."}
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
                    <CreditCard className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">All Transactions</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                                <p className="text-2xl font-bold">${stats?.totalAmount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
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
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{stats?.byStatus?.Pending?.count || 0}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>


            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search transactions..."
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
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Failed">Failed</option>
                            <option value="Rejected">Rejected</option>
                        </select>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">End Date</label>
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
                        
                        {(selectedTransactions.length > 0 || searchTerm || selectedStatus !== "all" || startDate || endDate) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {searchTerm && (
                                    <Badge variant="outline" className="text-xs">
                                        Search: {searchTerm}
                                    </Badge>
                                )}
                                {selectedStatus !== "all" && (
                                    <Badge variant="outline" className="text-xs">
                                        Status: {selectedStatus}
                                    </Badge>
                                )}
                                {startDate && (
                                    <Badge variant="outline" className="text-xs">
                                        From: {startDate}
                                    </Badge>
                                )}
                                {endDate && (
                                    <Badge variant="outline" className="text-xs">
                                        To: {endDate}
                                    </Badge>
                                )}
                            </div>
                        )}
                        
                        {selectedTransactions.length > 0 && (
                            <BulkActions 
                                selectedIds={selectedTransactions}
                                onComplete={() => setSelectedTransactions([])}
                                onBulkUpdate={handleBulkUpdate}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>


       
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Stripe Status</TableHead>
                                    <TableHead>Output</TableHead>
                                    <TableHead>Network</TableHead>
                                    <TableHead>Payment ID</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                )}

                                {transactions.map((transaction) => (
                                    <TransactionTableRow 
                                        key={transaction.id} 
                                        transaction={transaction}
                                        onRetry={handleRetry}
                                        retryMutation={retryMutation}
                                        shouldShowRetry={shouldShowRetry(transaction)}
                                    />
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

function TransactionTableRow({ 
    transaction, 
    onRetry,
    retryMutation,
    shouldShowRetry
}: { 
    transaction: Transaction;
    onRetry: (id: string) => void;
    retryMutation: any;
    shouldShowRetry: boolean;
}) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Confirmed':
                return <Badge variant="default" className="bg-green-500">Confirmed</Badge>;
            case 'Paid':
                return <Badge variant="default" className="bg-blue-500">Paid</Badge>;
            case 'Pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'Failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'Rejected':
                return <Badge variant="outline" className="border-red-200 text-red-700">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getStripeStatusBadge = (stripeStatus: string) => {
        switch (stripeStatus) {
            case 'succeeded':
                return <Badge variant="default" className="bg-green-500">Succeeded</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'processing':
                return <Badge variant="secondary">Processing</Badge>;
            case 'requires_payment_method':
                return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Requires Payment</Badge>;
            default:
                return <Badge variant="outline">{stripeStatus || 'N/A'}</Badge>;
        }
    };

    const getOutputBadge = (output: number) => {
        switch (output) {
            case 1:
                return <Badge variant="outline" className="bg-blue-50 text-blue-700">Internal</Badge>;
            case 2:
                return <Badge variant="outline" className="bg-green-50 text-green-700">Sataragan</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <TableRow key={transaction.id}>
            <TableCell className="font-mono text-xs">
                {transaction.id.slice(-8)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{transaction.uid}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{transaction.phone_number}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">${transaction.amount}</span>
                    </div>
                    {transaction.discount_amount && transaction.discount_amount > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground line-through">
                                ${transaction.original_amount}
                            </span>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                -${transaction.discount_amount}
                            </Badge>
                        </div>
                    )}
                    {transaction.promo_code && (
                        <div className="text-xs text-muted-foreground">
                            <Tag className="h-3 w-3 inline mr-1" />
                            {transaction.promo_code}
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
            <TableCell>{getStripeStatusBadge(transaction.stripe_status)}</TableCell>
            <TableCell>{getOutputBadge(transaction.output)}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{transaction.network}</span>
                </div>
            </TableCell>
            <TableCell className="font-mono text-xs">
                {transaction.payment_id ? transaction.payment_id.slice(-8) : 'N/A'}
            </TableCell>
            <TableCell className="text-sm">
                {formatDate(transaction.createdAt)}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <TransactionDetailsDialog transaction={transaction} />
                    {shouldShowRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRetry(transaction.id)}
                            disabled={retryMutation.isPending}
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {retryMutation.isPending ? "Retrying..." : "Retry"}
                        </Button>
                    )}
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {shouldShowRetry && (
                                <DropdownMenuItem onClick={() => onRetry(transaction.id)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry Transaction
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Export Details
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
    );
}

function TransactionDetailsDialog({ transaction }: { transaction: Transaction }) {
    const [open, setOpen] = useState(false);
    const { data: timelineData, isLoading } = useQuery({
        queryKey: ["transaction-timeline", transaction.id],
        queryFn: async () => {
            const response = await api.get(`/transactions/admin/transactions/${transaction.id}/timeline`);
            return response.data.data;
        },
        enabled: open,
    });

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

    const getTimelineIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Transaction Details</DialogTitle>
                </DialogHeader>
                
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Transaction Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Transaction Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <DollarSign className="h-4 w-4" />
                                            Amount
                                        </label>
                                        <p className="text-lg font-bold">${transaction.amount}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" />
                                            Status
                                        </label>
                                        <div>
                                            {transaction.status === 'Confirmed' ? (
                                                <Badge variant="default" className="bg-green-500">Confirmed</Badge>
                                            ) : transaction.status === 'Paid' ? (
                                                <Badge variant="default" className="bg-blue-500">Paid</Badge>
                                            ) : transaction.status === 'Failed' ? (
                                                <Badge variant="destructive">Failed</Badge>
                                            ) : (
                                                <Badge variant="secondary">{transaction.status}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Globe className="h-4 w-4" />
                                            Stripe Status
                                        </label>
                                        <div>
                                            {transaction.stripe_status === 'succeeded' ? (
                                                <Badge variant="default" className="bg-green-500">Succeeded</Badge>
                                            ) : transaction.stripe_status === 'failed' ? (
                                                <Badge variant="destructive">Failed</Badge>
                                            ) : (
                                                <Badge variant="outline">{transaction.stripe_status || 'N/A'}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Server className="h-4 w-4" />
                                            Output
                                        </label>
                                        <div>
                                            {transaction.output === 1 ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700">Internal</Badge>
                                            ) : transaction.output === 2 ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700">Sataragan</Badge>
                                            ) : (
                                                <Badge variant="outline">Unknown</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            Customer UID
                                        </label>
                                        <p className="font-mono text-sm break-all">{transaction.uid}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Smartphone className="h-4 w-4" />
                                            Phone Number
                                        </label>
                                        <p className="text-sm">{transaction.phone_number}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Network className="h-4 w-4" />
                                            Network
                                        </label>
                                        <p className="text-sm">{transaction.network}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Globe className="h-4 w-4" />
                                            Currency
                                        </label>
                                        <p className="text-sm">{transaction.currency}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground">Original Amount</label>
                                        <p className="text-sm">${transaction.original_amount || transaction.amount}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground">Discount Amount</label>
                                        <p className="text-sm">${transaction.discount_amount || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground">Value</label>
                                        <p className="text-sm">${transaction.value}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                        <p className="font-mono text-sm break-all">
                                            {transaction.payment_id || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                
                                {transaction.promo_code && (
                                    <div className="pt-4 border-t">
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <h4 className="font-medium text-blue-800 flex items-center gap-2">
                                                <Tag className="h-4 w-4" />
                                                Promo Code Applied
                                            </h4>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm text-blue-700">
                                                    <strong>Code:</strong> {transaction.promo_code}
                                                </p>
                                                {transaction.discount_amount && transaction.discount_amount > 0 && (
                                                    <p className="text-sm text-blue-700">
                                                        <strong>Discount:</strong> ${transaction.discount_amount}
                                                    </p>
                                                )}
                                                {transaction.PromoUses && transaction.PromoUses[0]?.PromoCode && (
                                                    <p className="text-sm text-blue-700">
                                                        <strong>Type:</strong> {transaction.PromoUses[0].PromoCode.discount_type}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <CalendarIcon className="h-4 w-4" />
                                            Created At
                                        </label>
                                        <p className="text-sm">{formatDate(transaction.createdAt)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <CalendarIcon className="h-4 w-4" />
                                            Updated At
                                        </label>
                                        <p className="text-sm">{formatDate(transaction.updatedAt)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Transaction Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {timelineData?.timeline?.map((event: any, index: number) => (
                                        <div key={index} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                {getTimelineIcon(event.status)}
                                                {index < timelineData.timeline.length - 1 && (
                                                    <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{event.event}</p>
                                                        <p className="text-sm text-muted-foreground">{event.details}</p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                                                        {formatDate(event.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!timelineData?.timeline || timelineData.timeline.length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Clock className="h-8 w-8 mx-auto mb-2" />
                                            <p>No timeline events available</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sataragan Details */}
                        {transaction.ApiSataragans && transaction.ApiSataragans.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Server className="h-5 w-5" />
                                        Sataragan API Calls ({transaction.ApiSataragans.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {transaction.ApiSataragans.map((sataragan, index) => (
                                            <div key={sataragan.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">Call {index + 1}</Badge>
                                                        <Badge variant={
                                                            sataragan.status === 'Success' ? 'default' : 
                                                            sataragan.status === 'Failed' ? 'destructive' : 'outline'
                                                        }>
                                                            {sataragan.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(sataragan.createdAt)}
                                                    </p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <label className="font-medium text-muted-foreground">Message:</label>
                                                        <p className="mt-1">{sataragan.message || 'No message'}</p>
                                                    </div>
                                                    {sataragan.txn_id && (
                                                        <div>
                                                            <label className="font-medium text-muted-foreground">Transaction ID:</label>
                                                            <p className="font-mono mt-1">{sataragan.txn_id}</p>
                                                        </div>
                                                    )}
                                                    {sataragan.api_txn_id && (
                                                        <div>
                                                            <label className="font-medium text-muted-foreground">API Transaction ID:</label>
                                                            <p className="font-mono mt-1">{sataragan.api_txn_id}</p>
                                                        </div>
                                                    )}
                                                    {sataragan.commission && (
                                                        <div>
                                                            <label className="font-medium text-muted-foreground">Commission:</label>
                                                            <p className="mt-1">${sataragan.commission}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function BulkActions({ 
    selectedIds, 
    onComplete,
    onBulkUpdate 
}: { 
    selectedIds: string[]; 
    onComplete: () => void;
    onBulkUpdate: (status: string) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
            </span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        Bulk Actions
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onBulkUpdate('Confirmed')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Confirmed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkUpdate('Paid')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkUpdate('Failed')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark as Failed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkUpdate('Rejected')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark as Rejected
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}