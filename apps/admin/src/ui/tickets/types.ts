export type TicketStatus = "open" | "pending" | "closed";
export type TicketPriority = "low" | "normal" | "high";

export type TicketDTO = {
  id: string;
  customer_user_id: string | null;
  assignee_user_id: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
};

export type TicketCommentDTO = {
  id: string;
  ticket_id: string;
  author_user_id: string;
  body: string;
  internal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserLite = { id: string; email: string | null; role: string };

export type TicketListResponse = {
  data: TicketDTO[];
  meta: { page: number; limit: number; count: number };
};
