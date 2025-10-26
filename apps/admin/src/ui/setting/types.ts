// src/ui/setting/types.ts
export type CurrencyDTO = {
  id?: string;
  code: string;
  name?: string | null;
  symbol?: string | null;

  // used by the UI
  decimals?: number | null;
  rate_to_base?: number | null;
  is_base?: boolean;
  notes?: string | null;

  // keep these only if you actually use them elsewhere
  // minor?: number;
  // active?: boolean;
};

export type OperatorDTO = {
  id: string;
  code: string;
  name: string;
  country?: string | null;   // ⬅️ add this
  active?: boolean;
};