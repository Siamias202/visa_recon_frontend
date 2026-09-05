export type ReconciliationStatus =
  | "MATCHED"
  | "MISSING_IN_CBS"
  | "MISSING_IN_BO"
  | "REVERSE_TRANSACTION";

export type MatchingResultStatus = Exclude<
  ReconciliationStatus,
  "REVERSE_TRANSACTION"
>;

export interface ReconciliationRun {
  runId: number;
  startedAt: string;
  completedAt: string;
  status: string;
  matchedCount: number;
  missingInCbsCount: number;
  missingInBoCount: number;
  reverseCount: number;
  reversalCount: number;
  reverseTransactionsDeleted: number;
}

export type MatchingResultRecord = Record<string, unknown>;

export interface MatchingResultsRequest {
  runId: number;
  reconciliationStatus: MatchingResultStatus;
  page: number;
  pageSize: number;
  currency?: string;
  category?: string;
  accountNumber?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReversalsRequest {
  runId: number;
  page: number;
  pageSize: number;
}

export interface MatchingResultsResponse {
  items: MatchingResultRecord[];
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
  hasNextPage: boolean;
}
