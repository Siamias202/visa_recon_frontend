export type PreviewType = "cbs" | "bo" | "gl" | "fe" | "ep";
export type TransactionArea = "issuing" | "acquiring";

export interface PreviewRecord {
  [column: string]: string;
}

export interface PreviewResponse {
  items: PreviewRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PreviewRequest {
  type: PreviewType;
  page?: number;

  pageSize?: number;

  searchQuery?: string | null;

  sortBy?: string | null;

  sortDirection?: "asc" | "desc" | null;

  currency?: "BDT" | "USD" | null;
  category?: "ATM" | "POS" | "PREAUTH" | null;
}
