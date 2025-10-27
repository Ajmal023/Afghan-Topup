import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import type { ProviderConfigDTO } from "./types";
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
import { Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Key } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { providerConfigService } from "@/services/providerService";

export default function ProviderConfigsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProviders, setFilteredProviders] = useState<ProviderConfigDTO[]>([]);

  const { data: providers, isLoading, error } = useQuery({
    queryKey: ["provider-configs"],
    queryFn: async () => {
      const response = await providerConfigService.getAll();
      return response.data;
    },
  });

  useEffect(() => {
    if (providers) {
      const filtered = providers.filter(provider =>
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProviders(filtered);
    }
  }, [providers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Provider Configurations</h1>
        </div>
        <AddProviderDialog />
      </div>

  
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Provider List</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
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
                      Error loading providers
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !error && filteredProviders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {providers && providers.length > 0 ? 'No providers match your search' : 'No providers found'}
                    </TableCell>
                  </TableRow>
                )}

                {filteredProviders.map((provider) => (
                  <ProviderTableRow key={provider.id} provider={provider} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
  
    </div>
  );
}

function ProviderTableRow({ provider }: { provider: ProviderConfigDTO }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => providerConfigService.toggleStatus(provider.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-configs"] });
      toast.success(`Provider ${provider.active ? 'deactivated' : 'activated'} successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update provider status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => providerConfigService.delete(provider.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-configs"] });
      toast.success("Provider configuration deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete provider configuration");
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this provider configuration?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <TableRow key={provider.id}>
      <TableCell className="font-medium">{provider.name}</TableCell>
      <TableCell>
        <Badge variant="outline">{provider.provider}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={provider.active ? "default" : "secondary"}>
          {provider.active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {new Date(provider.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <EditProviderDialog provider={provider} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
          >
            {provider.active ? (
              <ToggleRight className="h-4 w-4 mr-1" />
            ) : (
              <ToggleLeft className="h-4 w-4 mr-1" />
            )}
            {toggleMutation.isPending ? "Updating..." : provider.active ? "Deactivate" : "Activate"}
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

function AddProviderDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    provider: "",
    name: "",
    credentials: "{}",
    active: false
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: providerConfigService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-configs"] });
      toast.success("Provider configuration created successfully");
      setOpen(false);
      setFormData({ provider: "", name: "", credentials: "{}", active: false });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error creating provider configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider || !formData.name || !formData.credentials) {
      toast.error("Provider, name, and credentials are required");
      return;
    }

    try {
      const credentials = JSON.parse(formData.credentials);
      createMutation.mutate({
        provider: formData.provider,
        name: formData.name,
        credentials,
        active: formData.active
      });
    } catch (error) {
      toast.error("Invalid JSON format in credentials");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Provider Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="provider" className="text-sm font-medium">
              Provider Type *
            </label>
            <Input
              id="provider"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., stripe, paypal, etc."
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Provider Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Stripe Production, PayPal Sandbox"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="credentials" className="text-sm font-medium">
              Credentials (JSON) *
            </label>
            <Textarea
              id="credentials"
              value={formData.credentials}
              onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
              placeholder='{"api_key": "your_api_key", "secret": "your_secret"}'
              rows={4}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="active" className="text-sm font-medium">
              Active
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
              {createMutation.isPending ? "Creating..." : "Create Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProviderDialog({ provider }: { provider: ProviderConfigDTO }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    provider: provider.provider,
    name: provider.name,
    credentials: JSON.stringify(provider.credentials, null, 2),
    active: provider.active
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => providerConfigService.update(provider.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-configs"] });
      toast.success("Provider configuration updated successfully");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error updating provider configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider || !formData.name || !formData.credentials) {
      toast.error("Provider, name, and credentials are required");
      return;
    }

    try {
      const credentials = JSON.parse(formData.credentials);
      updateMutation.mutate({
        provider: formData.provider,
        name: formData.name,
        credentials,
        active: formData.active
      });
    } catch (error) {
      toast.error("Invalid JSON format in credentials");
    }
  };

  return (
    <Dialog  open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Provider Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-provider" className="text-sm font-medium">
              Provider Type *
            </label>
            <Input
              id="edit-provider"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Provider Name *
            </label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-credentials" className="text-sm font-medium">
              Credentials (JSON) *
            </label>
            <Textarea
              id="edit-credentials"
              value={formData.credentials}
              onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="edit-active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="edit-active" className="text-sm font-medium">
              Active
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
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}