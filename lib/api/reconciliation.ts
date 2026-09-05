import {
  MatchingResultRecord,
  MatchingResultsRequest,
  MatchingResultsResponse,
  ReconciliationRun,
  ReversalsRequest,
} from "@/types/reconciliation";
import { TransactionArea } from "@/types/preview";

const normalizeKey = (key: string) =>
  key.replace(/[^a-z0-9]/gi, "").toLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getProperty = (
  source: Record<string, unknown>,
  ...candidateKeys: string[]
): unknown => {
  for (const key of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  const normalizedCandidates = new Set(candidateKeys.map(normalizeKey));
  const matchingEntry = Object.entries(source).find(([key]) =>
    normalizedCandidates.has(normalizeKey(key)),
  );

  return matchingEntry?.[1];
};

const unwrapData = (value: unknown): unknown => {
  if (!isRecord(value)) return value;

  const data = getProperty(value, "data");
  return data === undefined || data === null ? value : data;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

async function parseResponse(response: Response): Promise<unknown> {
  const responseBody = await response.text();

  if (!response.ok) {
    let message = "The reconciliation request failed";

    if (responseBody.trim()) {
      try {
        const parsed = JSON.parse(responseBody) as unknown;
        if (isRecord(parsed)) {
          const responseMessage = getProperty(parsed, "message", "error", "title");
          if (typeof responseMessage === "string" && responseMessage.trim()) {
            message = responseMessage;
          }
        }
      } catch {
        message = responseBody;
      }
    }

    throw new Error(message);
  }

  if (!responseBody.trim()) {
    throw new Error("The reconciliation service returned an empty response");
  }

  try {
    return JSON.parse(responseBody) as unknown;
  } catch {
    throw new Error("The reconciliation service returned invalid JSON");
  }
}

export async function runReconciliation(
  area: TransactionArea = "issuing",
): Promise<ReconciliationRun> {
  const endpoint =
    area === "acquiring"
      ? "/api/acquiring/reconciliation/run"
      : "/api/Main/RunMatchAction";
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
  });

  const raw = unwrapData(await parseResponse(response));
  if (!isRecord(raw)) {
    throw new Error("The reconciliation service returned an invalid run result");
  }

  const runId = toNumber(getProperty(raw, "runId"), Number.NaN);
  if (!Number.isInteger(runId) || runId <= 0) {
    throw new Error("The reconciliation service did not return a valid run ID");
  }

  const reversalCount = toNumber(
    getProperty(raw, "reversalCount", "reverseCount"),
  );

  return {
    runId,
    startedAt: String(getProperty(raw, "startedAt") ?? ""),
    completedAt: String(getProperty(raw, "completedAt") ?? ""),
    status: String(getProperty(raw, "status") ?? ""),
    matchedCount: toNumber(getProperty(raw, "matchedCount")),
    missingInCbsCount: toNumber(getProperty(raw, "missingInCbsCount")),
    missingInBoCount: toNumber(getProperty(raw, "missingInBoCount")),
    reverseCount: reversalCount,
    reversalCount,
    reverseTransactionsDeleted: toNumber(
      getProperty(raw, "reverseTransactionsDeleted"),
    ),
  };
}

export async function deleteTestData(
  area: TransactionArea,
): Promise<void> {
  const response = await fetch(`/api/${area}/test-data`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.ok) return;

  const responseBody = await response.text();
  let message = `Unable to delete ${area} test data`;

  if (responseBody.trim()) {
    try {
      const parsed = JSON.parse(responseBody) as unknown;
      if (isRecord(parsed)) {
        const responseMessage = getProperty(parsed, "message", "error", "title");
        if (typeof responseMessage === "string" && responseMessage.trim()) {
          message = responseMessage;
        }
      }
    } catch {
      message = responseBody;
    }
  }

  throw new Error(message);
}

export async function getMatchingResults(
  payload: MatchingResultsRequest,
  signal?: AbortSignal,
  area: TransactionArea = "issuing",
): Promise<MatchingResultsResponse> {
  const endpoint =
    area === "acquiring"
      ? "/api/acquiring/reconciliation/results"
      : "/api/Main/GetMatchingResults";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });

  const raw = await parseResponse(response);
  const unwrapped = unwrapData(raw);
  const container = isRecord(unwrapped) ? unwrapped : isRecord(raw) ? raw : {};
  const itemSource = Array.isArray(unwrapped)
    ? unwrapped
    : getProperty(container, "items", "results", "records", "matchingResults");
  const items: MatchingResultRecord[] = Array.isArray(itemSource)
    ? itemSource.filter(isRecord)
    : [];

  const page = toNumber(getProperty(container, "page", "pageNumber"), payload.page);
  const pageSize = toNumber(
    getProperty(container, "pageSize"),
    payload.pageSize,
  );
  const totalItems = toOptionalNumber(
    getProperty(container, "totalItems", "totalRecords", "totalCount"),
  );
  const totalPages = toOptionalNumber(getProperty(container, "totalPages"));
  const explicitHasNext = getProperty(container, "hasNextPage", "hasNext");
  const hasNextPage =
    typeof explicitHasNext === "boolean"
      ? explicitHasNext
      : totalPages !== undefined
        ? page < totalPages
        : totalItems !== undefined
          ? page * pageSize < totalItems
          : items.length === pageSize;

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages:
      totalPages ??
      (totalItems !== undefined && pageSize > 0
        ? Math.max(1, Math.ceil(totalItems / pageSize))
        : undefined),
    hasNextPage,
  };
}

export async function getReversals(
  payload: ReversalsRequest,
  signal?: AbortSignal,
  area: TransactionArea = "issuing",
): Promise<MatchingResultsResponse> {
  const endpoint =
    area === "acquiring"
      ? "/api/acquiring/reconciliation/reversals"
      : "/api/Main/GetReversals";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });

  const raw = await parseResponse(response);
  const unwrapped = unwrapData(raw);
  const container = isRecord(unwrapped) ? unwrapped : {};
  const itemSource = getProperty(container, "items");
  const items = Array.isArray(itemSource) ? itemSource.filter(isRecord) : [];
  const page = toNumber(getProperty(container, "page"), payload.page);
  const pageSize = toNumber(getProperty(container, "pageSize"), payload.pageSize);
  const totalItems = toOptionalNumber(getProperty(container, "totalItems"));
  const totalPages = toOptionalNumber(getProperty(container, "totalPages"));

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage:
      totalPages !== undefined
        ? page < totalPages
        : totalItems !== undefined
          ? page * pageSize < totalItems
          : items.length === pageSize,
  };
}
