export interface PackageDTO {
  id: string;
  cost: number;
  value: number;
  cost_currency: string;
  value_currency: string;
  base_cost: number;
  provider_id: string;
  provider?: {
    id: string;
    name: string;
    provider: string;
    active?: boolean;
  };
  status: boolean;
  created_at: string;
  updated_at: string;
}