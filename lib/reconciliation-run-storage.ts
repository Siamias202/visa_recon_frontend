import { ReconciliationRun } from "@/types/reconciliation";
import { TransactionArea } from "@/types/preview";

const getStorageKey = (area: TransactionArea) =>
  `reconciliation-run:${area}`;

const memoryRuns: Partial<Record<TransactionArea, ReconciliationRun>> = {};

const isReconciliationRun = (value: unknown): value is ReconciliationRun => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const run = value as Record<string, unknown>;
  return (
    typeof run.runId === "number" &&
    Number.isInteger(run.runId) &&
    run.runId > 0 &&
    typeof run.startedAt === "string" &&
    typeof run.completedAt === "string" &&
    typeof run.status === "string" &&
    typeof run.matchedCount === "number" &&
    typeof run.missingInCbsCount === "number" &&
    typeof run.missingInBoCount === "number" &&
    (typeof run.reverseCount === "number" ||
      typeof run.reversalCount === "number")
  );
};

export function storeReconciliationRun(
  area: TransactionArea,
  run: ReconciliationRun,
) {
  memoryRuns[area] = run;

  try {
    window.sessionStorage.setItem(getStorageKey(area), JSON.stringify(run));
  } catch {
    // The in-memory copy still supports navigation when storage is unavailable.
  }
}

export function getStoredReconciliationRun(
  area: TransactionArea,
): ReconciliationRun | null {
  let storedValue: string | null = null;

  try {
    storedValue = window.sessionStorage.getItem(getStorageKey(area));
  } catch {
    return memoryRuns[area] ?? null;
  }

  if (!storedValue) return memoryRuns[area] ?? null;

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    if (!isReconciliationRun(parsed)) return memoryRuns[area] ?? null;
    const run = parsed as ReconciliationRun;
    const reversalCount = run.reversalCount ?? run.reverseCount ?? 0;
    return {
      ...run,
      reverseCount: reversalCount,
      reversalCount,
      reverseTransactionsDeleted: run.reverseTransactionsDeleted ?? 0,
    };
  } catch {
    return memoryRuns[area] ?? null;
  }
}

export function clearStoredReconciliationRun(area: TransactionArea) {
  delete memoryRuns[area];

  try {
    window.sessionStorage.removeItem(getStorageKey(area));
  } catch {
    // The in-memory copy has already been cleared.
  }
}
