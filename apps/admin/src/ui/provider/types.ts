export interface ProviderConfigDTO {
  id: string;
  provider: string;
  name: string;
  credentials: any;
  active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}