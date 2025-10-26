export type SessionDTO = {
  id: string;
  user_id: string;
  jti: string;
  refresh_token_hash: string;
  revoked: boolean;
  ip: string | null;
  user_agent: string | null;
  expires_at: string; // ISO string
  createdAt: string;
  updatedAt: string;
};

export type SessionListResponse = { data: SessionDTO[] };
