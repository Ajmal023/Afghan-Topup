// src/ui/orders/types.ts
export type OrderStatus =
  | "created"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type OrderDTO = {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  total_minor: number | string;
  currency: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  OrderItems?: OrderItemDTO[];
};

export type OrderItemDTO = {
  id: string;
  order_id: string;
  product_variant_id?: string | null;
  name?: string | null;
  amount_minor?: number | string | null;
  currency?: string | null;
  quantity?: number | null;
  // timestamps may exist; optional
  createdAt?: string;
  updatedAt?: string;
};

export type OrderListResponse = {
  data: OrderDTO[];
  meta: { page: number; limit: number; count: number };
};

// Payments
export type PaymentIntentStatus =
  | "created"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PaymentIntentDTO = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  provider: string; // "stripe" | "paypal" | "aps" | ...
  amount_minor: number | string;
  currency: string; // usually "USD"
  status: PaymentIntentStatus;
  provider_ref?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentIntentListResponse = {
  data: PaymentIntentDTO[];
};

export function toNumber(n?: number | string | bigint | null): number {
  if (n == null) return 0;
  if (typeof n === "number") return n;
  if (typeof n === "bigint") return Number(n);
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : 0;
}
