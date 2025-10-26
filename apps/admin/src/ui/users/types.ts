// src/ui/users/types.ts
export type UserDTO = {
  id: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "sales" | "customer";
  is_email_verified: boolean;
  is_phone_verified: boolean;
  last_login_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; count: number };
};
