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
import { 
    Search, Filter, Calendar, DollarSign, RefreshCw, Eye, 
    Play, CheckCircle, XCircle, Clock, MoreVertical, 
    Download, BarChart3, Users, Phone, CreditCard, CheckSquare
} from "lucide-react";


let Checkbox: any;
try {
    const checkboxModule = require("@/components/ui/checkbox");
    Checkbox = checkboxModule.Checkbox;
} catch (error) {
    Checkbox = ({ checked, onCheckedChange, className, ...props }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${className || ''}`}
            {...props}
        />
    );
}

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
    output: number;
    currency: string;
    is_checked: boolean;
    createdAt: string;
    updatedAt: string;
    ApiSataragans?: Array<{
        id: string;
        status: string;
        message: string;
        txn_id: string;
        createdAt: string;
    }>;
    PromoUses?: Array<{
        PromoCode?: {
            code: string;
            discount_type: string;
            discount_value: number;
        };
    }>;
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

export default function NewTransactionsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate("");
        setEndDate("");
    }, []);

    const { data: transactionsResponse, isLoading, error } = useQuery<TransactionsResponse>({
        queryKey: ["new-transactions", page, searchTerm, selectedStatus, startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(searchTerm && { search: searchTerm }),
                ...(selectedStatus !== "all" && { status: selectedStatus }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate })
            });
            
            const response = await api.get(`/transactions/admin/transactions/unchecked?${params}`);
            return response.data;
        },
    });

    const transactions = transactionsResponse?.data || [];
    const pagination = transactionsResponse?.pagination;

    const queryClient = useQueryClient();

    const checkMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/transactions/admin/transactions/${id}/check`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["new-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["admin-transactions-stats"] });
            toast.success("Transaction marked as checked");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to mark transaction as checked");
        },
    });

    const bulkCheckMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await api.post('/transactions/admin/transactions/bulk-check', {
                transactionIds: ids
            });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["new-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["admin-transactions-stats"] });
            toast.success(data.message);
            setSelectedTransactions([]);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to mark transactions as checked");
        },
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTransactions(transactions.map(t => t.id));
        } else {
            setSelectedTransactions([]);
        }
    };

    const handleSelectTransaction = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedTransactions(prev => [...prev, id]);
        } else {
            setSelectedTransactions(prev => prev.filter(transactionId => transactionId !== id));
        }
    };

    const handleCheckTransaction = (id: string) => {
        checkMutation.mutate(id);
    };

    const handleBulkCheck = () => {
        if (selectedTransactions.length === 0) return;
        
        if (window.confirm(`Are you sure you want to mark ${selectedTransactions.length} transactions as checked?`)) {
            bulkCheckMutation.mutate(selectedTransactions);
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
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
            default:
                return <Badge variant="outline">{stripeStatus || 'N/A'}</Badge>;
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <CreditCard className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading New Transactions</h2>
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
                    <CheckSquare className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">New Transactions</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>


            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Unchecked Transactions</p>
                            <p className="text-2xl font-bold">{pagination?.totalItems || 0}</p>
                        </div>
                        <CheckSquare className="h-8 w-8 text-blue-500" />
                    </div>
                </CardContent>
            </Card>

   
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
                    
                    <div className="flex justify-between items-center mt-4">
                        <Button 
                            variant="outline" 
                            onClick={clearFilters}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Clear Filters
                        </Button>
                        
                        {selectedTransactions.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {selectedTransactions.length} selected
                                </span>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleBulkCheck}
                                    disabled={bulkCheckMutation.isPending}
                                >
                                    <CheckSquare className="h-4 w-4 mr-2" />
                                    {bulkCheckMutation.isPending ? "Marking..." : "Mark as Checked"}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>


     
                <CardHeader>
                    <CardTitle>Unchecked Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Stripe Status</TableHead>
                                    <TableHead>Payment ID</TableHead>
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
                                
                                {!isLoading && transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                            No unchecked transactions found
                                        </TableCell>
                                    </TableRow>
                                )}

                                {transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedTransactions.includes(transaction.id)}
                                                onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                                            />
                                        </TableCell>
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
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                <span className="font-medium">${transaction.amount}</span>
                                                {transaction.discount_amount && transaction.discount_amount > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        -${transaction.discount_amount}
                                                    </Badge>
                                                )}
                                            </div>
                                            {transaction.promo_code && (
                                                <div className="text-xs text-muted-foreground">
                                                    Promo: {transaction.promo_code}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                                        <TableCell>{getStripeStatusBadge(transaction.stripe_status)}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {transaction.payment_id ? transaction.payment_id.slice(-8) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <TransactionDetailsDialog transaction={transaction} />
                                                
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleCheckTransaction(transaction.id)}
                                                    disabled={checkMutation.isPending}
                                                >
                                                    <CheckSquare className="h-4 w-4 mr-1" />
                                                    {checkMutation.isPending ? "Marking..." : "Check"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Amount</label>
                                        <p className="text-lg font-bold">${transaction.amount}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <div className="mt-1">
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
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Stripe Status</label>
                                        <div className="mt-1">
                                            {transaction.stripe_status === 'succeeded' ? (
                                                <Badge variant="default" className="bg-green-500">Succeeded</Badge>
                                            ) : transaction.stripe_status === 'failed' ? (
                                                <Badge variant="destructive">Failed</Badge>
                                            ) : (
                                                <Badge variant="outline">{transaction.stripe_status || 'N/A'}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Checked</label>
                                        <div className="mt-1">
                                            <Badge variant={transaction.is_checked ? "default" : "outline"}>
                                                {transaction.is_checked ? "Yes" : "No"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Customer UID</label>
                                        <p className="font-mono text-sm">{transaction.uid}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                        <p>{transaction.phone_number}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Original Amount</label>
                                        <p>${transaction.original_amount || transaction.amount}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Discount</label>
                                        <p>${transaction.discount_amount || 0}</p>
                                    </div>
                                </div>
                                
                                {transaction.promo_code && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <h4 className="font-medium text-blue-800">Promo Code Applied</h4>
                                        <p className="text-sm text-blue-700">
                                            Code: {transaction.promo_code} 
                                            {transaction.discount_amount && ` - Discount: $${transaction.discount_amount}`}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction Timeline</CardTitle>
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
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sataragan Details */}
                        {transaction.ApiSataragans && transaction.ApiSataragans.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sataragan API Calls</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {transaction.ApiSataragans.map((sataragan, index) => (
                                            <div key={sataragan.id} className="p-3 border rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">Call {index + 1}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Status: {sataragan.status}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Message: {sataragan.message || 'No message'}
                                                        </p>
                                                        {sataragan.txn_id && (
                                                            <p className="text-sm font-mono">
                                                                Txn ID: {sataragan.txn_id}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(sataragan.createdAt)}
                                                    </p>
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