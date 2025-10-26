// src/ui/catalog/types.ts
export type OperatorDTO = {
    id: string;
    code: string;
    name: string;
    country: string;
    createdAt?: string;
    updatedAt?: string;
};

export type CurrencyDTO = {
    code: string;           // PK
    name?: string | null;
    symbol?: string | null;
    decimals?: number | null;
    rate_to_base?: number | null;
    is_base: boolean;
    source?: string | null;
    fetched_at?: string | null;
    notes?: string | null;
};

export type ContactDTO = {
    id: string;
    user_id: string;
    name: string;
    msisdn: string;
    operator_id?: string | null;
    notes?: string | null;
    Operator?: { id: string; code: string; name: string } | null;
    createdAt?: string;
    updatedAt?: string;
};
