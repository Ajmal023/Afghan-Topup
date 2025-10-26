import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EditPackagePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [cost, setCost] = useState("");
    const [value, setValue] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const { data: packageData, isLoading, error } = useQuery({
        queryKey: ["package", id],
        queryFn: async () => {
            const response = await api.get(`/packages/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });

    useEffect(() => {
        if (packageData) {
            setCost(packageData.cost?.toString() || "");
            setValue(packageData.value?.toString() || "");
        }
    }, [packageData]);

    const updateMutation = useMutation({
        mutationFn: async (data: { cost: number; value: number }) => {
            const response = await api.patch(`/packages/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success("Package edited successfully");
            setTimeout(() => navigate("/packages"), 1000);
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

        updateMutation.mutate({
            cost: parseFloat(cost),
            value: parseFloat(value),
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
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Edit Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Package Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4">
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
            </Card>
        </div>
    );
}