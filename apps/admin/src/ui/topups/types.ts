export type Meta = { page: number; limit: number; count: number };

export type TopupLogListItem = {
  id: string;
  provider: string;
  operator_id: string;
  order_item_id: string;
  msisdn: string | null; // masked by API
  status: "sent" | "accepted" | "delivered" | "failed";
  provider_txn_id: string | null;
  error_code: string | null;
  error_message: string | null;
  createdAt: string;
};

export type TopupLogListResponse = { data: TopupLogListItem[]; meta: Meta };

export type OperatorLite = { id: string; code: string; name: string };

export type TopupLogDetail = {
  id: string;
  provider: string;
  operator_id: string;
  order_item_id: string;
  status: "sent" | "accepted" | "delivered" | "failed";
  provider_txn_id: string | null;
  error_code: string | null;
  error_message: string | null;
  msisdn: string | null; // masked in detail as well
  request_payload?: unknown;
  response_payload?: unknown;
  createdAt: string;
  updatedAt: string;

  Operator?: { id: string; code: string; name: string } | null;
  OrderItem?: {
    id: string;
    product_variant_id: string;
    amount_minor?: number;
    currency?: string;
    ProductVariant?: { id: string; name: string; code?: string | null } | null;
    Order?: {
      id: string;
      user_id: string | null;
      status: string;
      total_minor: number;
      currency: string;
    } | null;
  } | null;
};
