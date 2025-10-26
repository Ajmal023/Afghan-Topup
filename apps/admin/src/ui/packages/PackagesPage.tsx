import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { PackageDTO } from "./types";
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
import { Link } from "react-router-dom";


import { Search, Plus, Edit, Trash2, DollarSign, Package } from "lucide-react";

export default function PackagesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredPackages, setFilteredPackages] = useState<PackageDTO[]>([]);

    const { data: packages, isLoading, error } = useQuery<PackageDTO[]>({
        queryKey: ["packages"],
        queryFn: async () => {
            const response = await api.get("/api/packages/admin");
            return response.data.data;
        },
    });


    useEffect(() => {
        if (packages) {
            const filtered = packages.filter(pkg => 
                pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pkg.cost.toString().includes(searchTerm) ||
                pkg.value.toString().includes(searchTerm)
            );
            setFilteredPackages(filtered);
        }
    }, [packages, searchTerm]);

    return (
        <div className="space-y-6">
   
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">Packages</h1>
                </div>
                <AddPackageDialog />
            </div>

       
       
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle>Package List</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search packages..."
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
                                    <TableHead>ID</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Cost Currency</TableHead>
                                    <TableHead>Value Currency</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {error && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-red-500">
                                            Error loading packages
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && !error && filteredPackages.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {packages && packages.length > 0 ? 'No packages match your search' : 'No packages found'}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {filteredPackages.map((pkg) => (
                                    <PackageTableRow key={pkg.id} pkg={pkg} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
          
        </div>
    );
}

function PackageTableRow({ pkg }: { pkg: PackageDTO }) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/packages/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["packages"] });
            toast.success("Package deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to delete package");
        },
    });

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this package?")) {
            deleteMutation.mutate(pkg.id);
        }
    };

    return (
        <TableRow key={pkg.id}>
            <TableCell className="font-medium">{pkg.id}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span>{pkg.cost}</span>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="secondary" className="text-base">
                    {pkg.value}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge variant="outline">{pkg.cost_currency}</Badge>
            </TableCell>
            <TableCell>
                <Badge variant="outline">{pkg.value_currency}</Badge>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Link to={`/packages/edit/${pkg.id}`}>
                        <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                        </Button>
                    </Link>
                    <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function AddPackageDialog() {
    const [open, setOpen] = useState(false);
    const [cost, setCost] = useState("");
    const [value, setValue] = useState("");
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: { cost: number; value: number }) => {
            const response = await api.post("/api/packages", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["packages"] });
            toast.success("Package added successfully");
            setOpen(false);
            setCost("");
            setValue("");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Error, Something went wrong");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cost || !value) {
            toast.error("Cost and value are required");
            return;
        }

        createMutation.mutate({
            cost: parseFloat(cost),
            value: parseFloat(value),
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Package</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="cost" className="text-sm font-medium">
                            Cost *
                        </label>
                        <Input
                            id="cost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="Enter amount"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="value" className="text-sm font-medium">
                            Value *
                        </label>
                        <Input
                            id="value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Enter amount"
                            required
                        />
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
                            {createMutation.isPending ? "Adding..." : "Add Package"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}