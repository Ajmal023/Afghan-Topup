import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


import { toast } from "sonner";
import type {ProviderConfigDTO} from "../provider/types"
import type { PackageDTO } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {  CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Plus, Edit, Trash2, DollarSign, Package, 
  ToggleLeft, ToggleRight, 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { packageService } from "@/services/packageService";
import { providerConfigService } from "@/services/providerService";

export default function PackagesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [filteredPackages, setFilteredPackages] = useState<PackageDTO[]>([]);

  const { data: packages, isLoading, error } = useQuery<PackageDTO[]>({
    queryKey: ["packages"],
    queryFn: async () => {
      const response = await packageService.getAdminPackages();
      return response.data;
    },
  });

  const { data: providers } = useQuery<ProviderConfigDTO[]>({
    queryKey: ["active-providers"],
    queryFn: async () => {
      const response = await providerConfigService.getActive();
      return response.data;
    },
  });

  useEffect(() => {
    if (packages) {
      let filtered = packages.filter(pkg => 
        pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.cost.toString().includes(searchTerm) ||
        pkg.value.toString().includes(searchTerm) ||
        pkg.provider?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.provider?.provider.toLowerCase().includes(searchTerm.toLowerCase())
      );


      if (statusFilter !== "all") {
        filtered = filtered.filter(pkg => 
          statusFilter === "active" ? pkg.status : !pkg.status
        );
      }

     
      if (providerFilter !== "all") {
        filtered = filtered.filter(pkg => pkg.provider_id === providerFilter);
      }

      setFilteredPackages(filtered);
    }
  }, [packages, searchTerm, statusFilter, providerFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Packages</h1>
        </div>
        <AddPackageDialog providers={providers || []} />
      </div>

    

        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Package List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-filter">Provider</Label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers?.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost Currency</TableHead>
                  <TableHead>Value Currency</TableHead>
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
                
                {error && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-red-500">
                      Error loading packages
                    </TableCell>
                  </TableRow>
                )}
                
                {!isLoading && !error && filteredPackages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {packages && packages.length > 0 ? 'No packages match your filters' : 'No packages found'}
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
      await packageService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete package");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await packageService.toggleStatus(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update package status");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this package?")) {
      deleteMutation.mutate(pkg.id);
    }
  };

  const handleToggleStatus = () => {
    toggleStatusMutation.mutate(pkg.id);
  };

  return (
    <TableRow key={pkg.id}>
      <TableCell className="font-medium">
        <div className="max-w-32 truncate" title={pkg.id}>
          {pkg.id}
        </div>
      </TableCell>
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
        {pkg.provider ? (
          <div className="space-y-1">
            <div className="font-medium text-sm">{pkg.provider.name}</div>
            <Badge variant="outline" className="text-xs">
              {pkg.provider.provider}
            </Badge>
          </div>
        ) : (
          <Badge variant="outline">No Provider</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={pkg.status ? "default" : "secondary"}>
          {pkg.status ? "Active" : "Inactive"}
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
            variant="outline" 
            size="sm"
            onClick={handleToggleStatus}
            disabled={toggleStatusMutation.isPending}
          >
            {pkg.status ? (
              <ToggleRight className="h-4 w-4 mr-1" />
            ) : (
              <ToggleLeft className="h-4 w-4 mr-1" />
            )}
            {toggleStatusMutation.isPending ? "Updating..." : pkg.status ? "Deactivate" : "Activate"}
          </Button>
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

function AddPackageDialog({ providers }: { providers: ProviderConfigDTO[] }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    cost: "",
    value: "",
    provider_id: "",
    status: true
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { cost: number; value: number; provider_id: string; status: boolean }) => {
      const response = await packageService.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package added successfully");
      setOpen(false);
      setFormData({ cost: "", value: "", provider_id: "", status: true });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error, Something went wrong");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cost || !formData.value || !formData.provider_id) {
      toast.error("Cost, value, and provider are required");
      return;
    }

    createMutation.mutate({
      cost: parseFloat(formData.cost),
      value: parseFloat(formData.value),
      provider_id: formData.provider_id,
      status: formData.status
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
            <Label htmlFor="cost">Cost *</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Provider *</Label>
            <Select 
              value={formData.provider_id} 
              onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(provider => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="status"
              checked={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="status" className="text-sm font-medium">
              Active
            </Label>
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