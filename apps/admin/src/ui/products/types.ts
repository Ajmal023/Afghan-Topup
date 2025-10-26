// src/ui/products/types.ts
export type ProductTypeDTO = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};
export type CategoryDTO = {
  id: string;
  name: string;
  slug?: string | null;
  parent_id?: string | null;
};
export type ProductVariantDTO = {
  id: string;
  product_id: string;
  name: string;
  amount_minor: number | null;
  currency: string;
  operator_id?: string | null;
  code?: string | null;
  is_active: boolean;
  display_usd_minor: number | null;
  display_usd_rate_to_base: number | null;
  display_usd_synced_at: string | null;
  is_custom_amount: boolean;
};
export type ProductDTO = {
  id: string;
  product_type_id: string;
  sku?: string | null;
  operator_id: string | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  allow_custom_amount_usd: boolean;
  custom_min_usd_minor: number | null;
  custom_max_usd_minor: number | null;
  custom_step_usd_minor: number | null;

  createdAt: string;
  updatedAt: string;
  ProductType?: ProductTypeDTO;
  ProductVariants?: ProductVariantDTO[];
  Categories?: CategoryDTO[];
};
export type PageMeta = { page: number; limit: number; count: number };
export type ProductListResponse = { data: ProductDTO[]; meta: PageMeta };
