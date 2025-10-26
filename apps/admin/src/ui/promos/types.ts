export type Meta = { page: number; limit: number; count: number };

export type PromoCodeDTO = {
  id: string;
  code: string;
  description: string | null;
  type: "percent" | "fixed";
  value: string | number; // DECIMAL comes back as string from PG
  currency: string | null; // required if type=fixed
  max_uses: number | null;
  max_uses_per_user: number | null;
  min_order_amount_minor: number | null;
  start_at: string | null;
  end_at: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromoUseDTO = {
  id: string;
  promo_code_id: string;
  user_id: string | null;
  order_id: string | null;
  amount_discount_minor: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type PromoListResponse = { data: PromoCodeDTO[]; meta: Meta };
export type PromoUseListResponse = { data: PromoUseDTO[]; meta: Meta };

export type CurrencyDTO = {
  code: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  is_base: boolean;
  rate_to_base: number | null;
};
