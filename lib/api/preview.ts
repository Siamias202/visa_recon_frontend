import {
  PreviewRecord,
  PreviewRequest,
  PreviewResponse,
  TransactionArea,
} from "@/types/preview";
import { ISSUING_BO_COLUMNS } from "@/lib/issuing-bo-columns";

const normalizeKey = (key: string) =>
  key.replace(/[^a-z0-9]/gi, "").toLowerCase();

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

const toPreviewString = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

const normalizePreviewItem = (item: Record<string, unknown>): PreviewRecord => ({
  posting_date: String(item.postingDate ?? item.posting_date ?? ""),
  value_date: String(item.valueDate ?? item.value_date ?? ""),
  batch_id: String(item.batchId ?? item.batch_id ?? ""),
  posting_branch: String(item.postingBranch ?? item.posting_branch ?? ""),
  unique_reference_no: String(
    item.uniqueReferenceNo ?? item.unique_reference_no ?? "",
  ),
  debit_credit: String(item.debitCredit ?? item.debit_credit ?? ""),
  amount: String(item.amount ?? ""),
  transaction_code: String(item.transactionCode ?? item.transaction_code ?? ""),
  transaction_name: String(
    item.transactionName ?? item.transaction_name ?? "",
  ),
  curency: String(item.currency ?? item.curency ?? ""),
  time_stamp: String(item.timeStamp ?? item.time_stamp ?? ""),
  unique_id: String(item.uniqueId ?? item.unique_id ?? ""),
  narrative_1: String(item.narrative1 ?? item.narrative_1 ?? ""),
  narrative_2: String(item.narrative2 ?? item.narrative_2 ?? ""),
  narrative_3: String(item.narrative3 ?? item.narrative_3 ?? ""),
  narrative_4: String(item.narrative4 ?? item.narrative_4 ?? ""),
  rrn: String(item.rrn ?? ""),
  auth_code: String(item.authCode ?? item.auth_code ?? ""),
});

const toCamelCase = (value: string) =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const normalizeBoItem = (item: Record<string, unknown>): PreviewRecord =>
  Object.fromEntries(
    ISSUING_BO_COLUMNS.map((field) => {
      const camelField = toCamelCase(field);
      return [field, toPreviewString(getProperty(item, field, camelField))];
    }),
  );

const normalizeFields = (
  item: Record<string, unknown>,
  fields: readonly string[],
): PreviewRecord =>
  Object.fromEntries(
    fields.map((field) => [field, toPreviewString(getProperty(item, field))]),
  );

const ACQUIRING_FE_FIELDS = [
  "id",
  "atm_id",
  "reversal",
  "request_amount",
  "bills1",
  "bills2",
  "bills3",
  "bills4",
  "udate",
  "time",
  "utr_no",
  "issuer_inst",
  "reference_num",
  "auth_code",
  "acct1",
  "hpan_card",
] as const;

const ACQUIRING_EP_FIELDS = [
  "id",
  "pan",
  "rrn",
  "acq",
  "integratedp",
  "aymen",
  "tsyste",
  "m",
  "amountbdt",
  "currency",
  "amountusd",
] as const;

export async function getPreview(
  payload: PreviewRequest,
  area: TransactionArea = "issuing",
): Promise<PreviewResponse> {
  const response = await fetch(`/api/${area}/preview?type=${payload.type}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, type: undefined }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = "Failed to fetch preview data";

    if (errorBody) {
      try {
        const parsed = JSON.parse(errorBody) as { message?: unknown };
        if (typeof parsed.message === "string" && parsed.message) {
          message = parsed.message;
        }
      } catch {
        message = errorBody;
      }
    }

    throw new Error(message);
  }

  const responseBody = await response.text();
  if (!responseBody.trim()) {
    throw new Error("Preview service returned an empty response");
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(responseBody) as Record<string, unknown>;
  } catch {
    throw new Error("Preview service returned invalid JSON");
  }
  const responseData = getProperty(raw, "data");
  const data =
    responseData && typeof responseData === "object" && !Array.isArray(responseData)
      ? (responseData as Record<string, unknown>)
      : raw;
  const rawItems = getProperty(data, "items");
  const items = Array.isArray(rawItems)
    ? rawItems.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  const page = Number(getProperty(data, "page") ?? 1);
  const pageSize = Number(
    getProperty(data, "pageSize") ??
      payload.pageSize ??
      (items.length > 0 ? items.length : 20),
  );
  const totalItems = Number(getProperty(data, "totalItems") ?? items.length);

  return {
    items: items.map((item: Record<string, unknown>) =>
      payload.type === "bo"
        ? normalizeBoItem(item)
        : payload.type === "fe"
          ? normalizeFields(item, ACQUIRING_FE_FIELDS)
          : payload.type === "ep"
            ? normalizeFields(item, ACQUIRING_EP_FIELDS)
            : payload.type === "gl" || payload.type === "cbs"
              ? normalizePreviewItem(item)
              : normalizePreviewItem(item),
    ),
    page,
    pageSize,
    totalItems,
    totalPages: Number(
      getProperty(data, "totalPages") ??
        (pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1),
    ),
  };
}
