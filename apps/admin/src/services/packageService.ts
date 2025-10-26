import { api } from "@/lib/api";
import type { PackageDTO } from "@/ui/packages/types";


export const packageService = {

  getAdminPackages: async (): Promise<{ data: PackageDTO[] }> => {
    const response = await api.get("/api/packages/admin");
    return response.data;
  },


  getCustomerPackages: async (): Promise<{ data: PackageDTO[] }> => {
    const response = await api.get("/api/packages");
    return response.data;
  },


  create: async (data: {
    cost: number;
    value: number;
    provider_id: string;
    status?: boolean;
  }): Promise<{ message: string; data: PackageDTO }> => {
    const response = await api.post("/api/packages", data);
    return response.data;
  },


  update: async (
    id: string,
    data: Partial<{
      cost: number;
      value: number;
      provider_id: string;
      status: boolean;
    }>
  ): Promise<{ message: string; data: PackageDTO }> => {
    const response = await api.put(`/api/packages/${id}`, data);
    return response.data;
  },


  toggleStatus: async (id: string): Promise<{ message: string; data: { id: string; status: boolean } }> => {
    const response = await api.patch(`/api/packages/${id}/toggle`);
    return response.data;
  },


  delete: async (id: string): Promise<{ status: number; message: string }> => {
    const response = await api.delete(`/api/packages/${id}`);
    return response.data;
  },
};