export interface PackageDTO {
    id: string;
    cost: number;
    cost_currency: string;
    value: number;
    value_currency: string;
    base_cost?: number;
    created_at?: string;
    updated_at?: string;
}