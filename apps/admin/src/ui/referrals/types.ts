export type Meta = { page: number; limit: number; count: number };

export type ReferralCodeDTO = {
  id: string;
  code: string;
  owner_user_id: string | null;
  active: boolean;
  max_uses: number | null;
  max_uses_per_user?: number | null; // optional depending on model
  start_at?: string | null;
  end_at?: string | null;
  expires_at?: string | null; // if you use expires_at instead
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReferralUseDTO = {
  id: string;
  referral_code_id: string;
  referrer_user_id: string;
  referred_user_id: string;
  order_id: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReferralListResponse = { data: ReferralCodeDTO[]; meta: Meta };
export type ReferralUseListResponse = { data: ReferralUseDTO[]; meta: Meta };

export type UserLite = { id: string; email: string | null; role: string };
