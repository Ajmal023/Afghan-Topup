import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { packageService } from "@/services/packageService";
import { providerConfigService } from "@/services/providerService";
import { toast } from "sonner";
import type {ProviderConfigDTO} from "../provider/types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EditPackagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cost: "",
    value: "",
    provider_id: "",
    status: true
  });

  const { data: packageData, isLoading, error } = useQuery({
    queryKey: ["package", id],
    queryFn: async () => {
      const response = await packageService.getAdminPackages();
      const packageItem = response.data.find(pkg => pkg.id === id);
      if (!packageItem) throw new Error("Package not found");
      return packageItem;
    },
    enabled: !!id,
  });

  const { data: providers } = useQuery<ProviderConfigDTO[]>({
    queryKey: ["active-providers"],
    queryFn: async () => {
      const response = await providerConfigService.getActive();
      return response.data;
    },
  });

  useEffect(() => {
    if (packageData) {
      setFormData({
        cost: packageData.cost?.toString() || "",
        value: packageData.value?.toString() || "",
        provider_id: packageData.provider_id || "",
        status: packageData.status
      });
    }
  }, [packageData]);

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      cost: number; 
      value: number; 
      provider_id: string; 
      status: boolean 
    }) => {
      const response = await packageService.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Package updated successfully");
      setTimeout(() => navigate("/packages"), 1000);
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

    updateMutation.mutate({
      cost: parseFloat(formData.cost),
      value: parseFloat(formData.value),
      provider_id: formData.provider_id,
      status: formData.status
    });
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
        <p className="text-red-800">Error loading package: {error.message}</p>
        <Link to="/packages">
          <Button variant="outline" className="mt-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-4">
        <Link to="/packages">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Edit Package</h1>
        </div>
      </div>



        <CardHeader>
          <CardTitle>Package Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
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
                    {providers?.map(provider => (
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
            </div>
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/packages")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Package"}
              </Button>
            </div>
          </form>
        </CardContent>
 
    </div>
  );
}