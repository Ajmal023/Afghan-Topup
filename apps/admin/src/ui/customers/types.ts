export interface CustomerDTO {
  id: string;
  uid: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  country_code: string;
  status: 'active' | 'inactive';
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomersResponse {
  data: CustomerDTO[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  recent: number;
}