export interface Customer {
  id: string;
  name: string;
  english_name: string | null;
  korean_name: string | null;
  birth_year: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** List rows carry only a short notes preview to keep responses small. */
export type CustomerListItem = Omit<Customer, "notes"> & { notes_preview: string | null };

export interface CustomerListResponse {
  customers: CustomerListItem[];
  /** Number of customers in the whole book (ignores the search). */
  total: number;
  /** True if more than the maximum number of rows matched. */
  truncated: boolean;
}
