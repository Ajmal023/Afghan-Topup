import { api } from "@/lib/api";
import type { ProviderConfigDTO } from "@/ui/provider/types";


export const providerConfigService = {
  getAll: async (): Promise<{ data: ProviderConfigDTO[] }> => {
    const response = await api.get("/provider-configs");
    return response.data;
  },


  getActive: async (): Promise<{ data: ProviderConfigDTO[] }> => {
    const response = await api.get("/provider-configs/active");
    return response.data;
  },


  create: async (data: {
    provider: string;
    name: string;
    credentials: any;
    active?: boolean;
  }): Promise<{ message: string; data: ProviderConfigDTO }> => {
    const response = await api.post("/provider-configs", data);
    return response.data;
  },


  update: async (
    id: string,
    data: Partial<{
      provider: string;
      name: string;
      credentials: any;
      active: boolean;
    }>
  ): Promise<{ message: string; data: ProviderConfigDTO }> => {
    const response = await api.put(`/provider-configs/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/provider-configs/${id}`);
    return response.data;
  },


  toggleStatus: async (id: string): Promise<{ message: string; data: { id: string; active: boolean } }> => {
    const response = await api.patch(`/provider-configs/${id}/toggle`);
    return response.data;
  },
};