"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  Download,
  Loader2,
  RotateCcw,
  SearchX,
  Trash2,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  deleteTestData,
  getMatchingResults,
  getReversals,
} from "@/lib/api/reconciliation";
import { ISSUING_BO_COLUMNS } from "@/lib/issuing-bo-columns";
import {
  getFilterAccountNumber,
  TransactionCategory,
  TransactionCurrency,
} from "@/lib/transaction-filters";
import {
  clearStoredReconciliationRun,
  getStoredReconciliationRun,
} from "@/lib/reconciliation-run-storage";
import {
  MatchingResultRecord,
  MatchingResultsResponse,
  ReconciliationRun,
  ReconciliationStatus,
} from "@/types/reconciliation";

const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 5000;

type ResultDataSource = "cbs" | "bo";
type CurrencyFilter = TransactionCurrency | "ALL";
type CategoryFilter = TransactionCategory | "ALL";

const hiddenResultColumns = new Set([
  "id",
  "runid",
  "reconciliationstatus",
  "businessdate",
  "agebucket",
  "createdat",
]);

const normalizeColumnKey = (key: string) =>
  key.replace(/[^a-z0-9]/gi, "").toLowerCase();

const isRecord = (value: unknown): value is MatchingResultRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseRecord = (value: unknown): MatchingResultRecord | null => {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getRecordProperty = (
  record: MatchingResultRecord,
  ...candidateKeys: string[]
): unknown => {
  const candidates = new Set(candidateKeys.map(normalizeColumnKey));
  return Object.entries(record).find(([key]) =>
    candidates.has(normalizeColumnKey(key)),
  )?.[1];
};

const flattenRecord = (
  record: MatchingResultRecord,
  prefix = "",
): MatchingResultRecord => {
  const flattened: MatchingResultRecord = {};

  Object.entries(record).forEach(([key, value]) => {
    if (hiddenResultColumns.has(normalizeColumnKey(key))) return;

    const column = prefix ? `${prefix}.${key}` : key;
    const nestedRecord = parseRecord(value);

    if (nestedRecord) {
      Object.assign(flattened, flattenRecord(nestedRecord, column));
    } else {
      flattened[column] = value;
    }
  });

  return flattened;
};

const getTransactionRecord = (
  item: MatchingResultRecord,
  source: ResultDataSource,
): MatchingResultRecord => {
  const payload =
    source === "cbs"
      ? getRecordProperty(item, "cbsData", "cbs", "cbsTransaction")
      : getRecordProperty(
          item,
          "boData",
          "glData",
          "bo",
          "gl",
          "boTransaction",
          "glTransaction",
        );

  const parsedRecord = parseRecord(payload);
  if (!parsedRecord || Object.keys(parsedRecord).length === 0) return {};

  const record = flattenRecord(parsedRecord);

  if (source !== "bo") return record;

  return Object.fromEntries(
    ISSUING_BO_COLUMNS.map((column) => [
      column,
      getRecordProperty(record, column) ?? "",
    ]),
  );
};

const getDisplayRecord = (
  item: MatchingResultRecord,
  status: ReconciliationStatus,
  matchedSource: ResultDataSource,
): MatchingResultRecord => {
  if (status === "MATCHED") {
    return getTransactionRecord(item, matchedSource);
  }

  if (status === "MISSING_IN_CBS" || status === "REVERSE_TRANSACTION") {
    const boRecord = getTransactionRecord(item, "bo");
    if (Object.keys(boRecord).length > 0) return boRecord;

    const cbsRecord = getTransactionRecord(item, "cbs");
    return Object.keys(cbsRecord).length > 0 ? cbsRecord : flattenRecord(item);
  }

  if (status === "MISSING_IN_BO") {
    const cbsRecord = getTransactionRecord(item, "cbs");
    return Object.keys(cbsRecord).length > 0 ? cbsRecord : flattenRecord(item);
  }

  return flattenRecord(item);
};

const getFlatResultRecord = (
  item: MatchingResultRecord,
): MatchingResultRecord =>
  Object.fromEntries(
    Object.entries(item).filter(
      ([key]) =>
        !new Set(["id", "runid", "reconciliationstatus"]).has(
          normalizeColumnKey(key),
        ),
    ),
  );

const categories: Array<{
  title: string;
  status: ReconciliationStatus;
  countKey: keyof Pick<
    ReconciliationRun,
    | "matchedCount"
    | "missingInCbsCount"
    | "missingInBoCount"
    | "reverseCount"
  >;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}> = [
  {
    title: "Matched",
    status: "MATCHED",
    countKey: "matchedCount",
    icon: CheckCircle2,
    iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Missing In CBS",
    status: "MISSING_IN_CBS",
    countKey: "missingInCbsCount",
    icon: SearchX,
    iconClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Missing In BO",
    status: "MISSING_IN_BO",
    countKey: "missingInBoCount",
    icon: SearchX,
    iconClassName: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    title: "Reversals",
    status: "REVERSE_TRANSACTION",
    countKey: "reverseCount",
    icon: RotateCcw,
    iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
];

const formatDate = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatColumnLabel = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const getExcelCellValue = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

function ReconciliationResultsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const area = pathname.startsWith("/acquiring") ? "acquiring" : "issuing";
  const areaLabel = area === "acquiring" ? "Acquiring" : "Issuing";
  const previewPath = `/${area}/preview`;
  const [storedRun, setStoredRun] = React.useState<ReconciliationRun | null>(
    null,
  );
  const [runLoaded, setRunLoaded] = React.useState(false);
  const run: ReconciliationRun = storedRun ?? {
    runId: 0,
    startedAt: "",
    completedAt: "",
    status: "",
    matchedCount: 0,
    missingInCbsCount: 0,
    missingInBoCount: 0,
    reverseCount: 0,
    reversalCount: 0,
    reverseTransactionsDeleted: 0,
  };
  const runId = run.runId;
  const hasValidRunId = Number.isInteger(runId) && runId > 0;

  const [selectedStatus, setSelectedStatus] =
    React.useState<ReconciliationStatus | null>(null);
  const [matchedSource, setMatchedSource] =
    React.useState<ResultDataSource>("cbs");
  const [results, setResults] = React.useState<MatchingResultsResponse | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [currency, setCurrency] = React.useState<CurrencyFilter>("ALL");
  const [category, setCategory] = React.useState<CategoryFilter>("ALL");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const requestInProgress = React.useRef(false);
  const activeRequest = React.useRef<AbortController | null>(null);
  const activeExport = React.useRef<AbortController | null>(null);
  const detailsRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (pathname.includes("/reconciliation-results")) {
      router.replace(`/${area}/output`);
    }
  }, [area, pathname, router]);

  React.useEffect(() => {
    activeRequest.current?.abort();
    activeExport.current?.abort();
    requestInProgress.current = false;
    setStoredRun(getStoredReconciliationRun(area));
    setRunLoaded(true);
    setSelectedStatus(null);
    setMatchedSource("cbs");
    setResults(null);
    setDetailsLoading(false);
    setExporting(false);
    setDetailsError(null);
  }, [area]);

  React.useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeExport.current?.abort();
    },
    [],
  );

  const selectedCategory = categories.find(
    (category) => category.status === selectedStatus,
  );

  const displayRows = React.useMemo(() => {
    if (!results || !selectedStatus) return [];
    return results.items.map((item) =>
      area === "acquiring" || selectedStatus === "REVERSE_TRANSACTION"
        ? getFlatResultRecord(item)
        : getDisplayRecord(item, selectedStatus, matchedSource),
    );
  }, [area, matchedSource, results, selectedStatus]);

  const columns = React.useMemo(() => {
    const keys = new Set<string>();
    displayRows.forEach((item) => {
      Object.keys(item).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [displayRows]);

  const loadDetails = async (
    reconciliationStatus: ReconciliationStatus,
    page: number,
    filterCurrency: CurrencyFilter = currency,
    filterCategory: CategoryFilter = category,
  ) => {
    if (!hasValidRunId || requestInProgress.current) return;

    requestInProgress.current = true;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setSelectedStatus(reconciliationStatus);
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const response =
        reconciliationStatus === "REVERSE_TRANSACTION"
          ? await getReversals(
              { runId, page, pageSize: PAGE_SIZE },
              controller.signal,
              area,
            )
          : await getMatchingResults(
              {
                runId,
                reconciliationStatus,
                page,
                pageSize: PAGE_SIZE,
                ...(area === "issuing"
                  ? {
                      ...(filterCurrency !== "ALL"
                        ? { currency: filterCurrency }
                        : {}),
                      ...(filterCategory !== "ALL"
                        ? { category: filterCategory }
                        : {}),
                      ...(filterCurrency !== "ALL" &&
                      filterCategory !== "ALL"
                        ? {
                            accountNumber: getFilterAccountNumber(
                              filterCurrency,
                              filterCategory,
                            ),
                          }
                        : {}),
                    }
                  : {}),
              },
              controller.signal,
              area,
            );
      setResults(response);
      window.setTimeout(
        () => detailsRef.current?.scrollIntoView({ behavior: "smooth" }),
        0,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResults(null);
      setDetailsError(
        error instanceof Error ? error.message : "Unable to load matching results",
      );
    } finally {
      if (activeRequest.current === controller) {
        requestInProgress.current = false;
        setDetailsLoading(false);
      }
    }
  };

  const loadAllResults = async (
    reconciliationStatus: ReconciliationStatus,
    signal: AbortSignal,
  ): Promise<MatchingResultRecord[]> => {
    const allItems: MatchingResultRecord[] = [];
    let page = 1;

    while (true) {
      const pageSize = area === "acquiring" ? 500 : EXPORT_PAGE_SIZE;
      const response =
        reconciliationStatus === "REVERSE_TRANSACTION"
          ? await getReversals({ runId, page, pageSize }, signal, area)
          : await getMatchingResults(
              {
                runId,
                reconciliationStatus,
                page,
                pageSize,
                ...(area === "issuing"
                  ? {
                      ...(currency !== "ALL" ? { currency } : {}),
                      ...(category !== "ALL" ? { category } : {}),
                      ...(currency !== "ALL" && category !== "ALL"
                        ? {
                            accountNumber: getFilterAccountNumber(
                              currency,
                              category,
                            ),
                          }
                        : {}),
                      dateFrom: dateFrom || undefined,
                      dateTo: dateTo || undefined,
                    }
                  : {}),
              },
              signal,
              area,
            );

      allItems.push(...response.items);

      if (
        response.items.length === 0 ||
        !response.hasNextPage ||
        (response.totalItems !== undefined &&
          allItems.length >= response.totalItems)
      ) {
        break;
      }

      page += 1;
    }

    return allItems;
  };

  const exportDetails = async () => {
    if (!selectedCategory || !hasValidRunId || exporting) return;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error("From date cannot be after To date");
      return;
    }

    activeExport.current?.abort();
    const controller = new AbortController();
    activeExport.current = controller;
    setExporting(true);

    try {
      const items = await loadAllResults(selectedCategory.status, controller.signal);
      if (items.length === 0) {
        toast.error("There are no records to export");
        return;
      }

      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const appendSheet = (sheetName: string, rows: MatchingResultRecord[]) => {
        const sheetColumns = Array.from(
          rows.reduce((keys, row) => {
            Object.keys(row).forEach((key) => keys.add(key));
            return keys;
          }, new Set<string>()),
        );
        const worksheetRows = [
          sheetColumns.map(formatColumnLabel),
          ...rows.map((row) =>
            sheetColumns.map((column) => getExcelCellValue(row[column])),
          ),
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
        const widthSamples = worksheetRows.slice(0, 201);
        worksheet["!cols"] = sheetColumns.map((_, columnIndex) => ({
          wch: Math.min(
            40,
            Math.max(
              10,
              ...widthSamples.map((row) => String(row[columnIndex] ?? "").length),
            ),
          ),
        }));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      };

      if (area === "acquiring") {
        appendSheet(
          selectedCategory.status === "REVERSE_TRANSACTION"
            ? "Reversal Pairs"
            : selectedCategory.title,
          items.map(getFlatResultRecord),
        );
      } else if (selectedCategory.status === "MATCHED") {
        appendSheet(
          "CBS",
          items.map((item) => getTransactionRecord(item, "cbs")),
        );
        appendSheet(
          "BO",
          items.map((item) => getTransactionRecord(item, "bo")),
        );
      } else if (selectedCategory.status === "MISSING_IN_CBS") {
        appendSheet(
          "BO",
          items.map((item) => getTransactionRecord(item, "bo")),
        );
      } else if (selectedCategory.status === "MISSING_IN_BO") {
        appendSheet(
          "CBS",
          items.map((item) => getTransactionRecord(item, "cbs")),
        );
      } else {
        appendSheet(
          "Reverse Transactions",
          items.map(getFlatResultRecord),
        );
      }

      const categoryName = selectedCategory.status
        .toLowerCase()
        .replaceAll("_", "-");
      XLSX.writeFile(
        workbook,
        `${area}-run-${runId}-${categoryName}.xlsx`,
        { compression: true },
      );
      toast.success(`${selectedCategory.title} export downloaded`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        error instanceof Error ? error.message : "Unable to export results",
      );
    } finally {
      if (activeExport.current === controller) {
        activeExport.current = null;
        setExporting(false);
      }
    }
  };

  const closeDetails = () => {
    activeRequest.current?.abort();
    activeExport.current?.abort();
    requestInProgress.current = false;
    setDetailsLoading(false);
    setExporting(false);
    setSelectedStatus(null);
    setMatchedSource("cbs");
    setResults(null);
    setDetailsError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteData = async () => {
    if (deleting) return;

    setDeleting(true);
    try {
      await deleteTestData(area);
      clearStoredReconciliationRun(area);
      setStoredRun(null);
      setSelectedStatus(null);
      setResults(null);
      setDeleteDialogOpen(false);
      toast.success(`${areaLabel} test data deleted successfully`);
      router.push(`/${area}/upload`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to delete ${area} test data`,
      );
    } finally {
      setDeleting(false);
    }
  };

  const currentPage = results?.page ?? 1;
  const fromRecord =
    results?.totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toRecord = results
    ? results.totalItems === undefined
      ? (currentPage - 1) * PAGE_SIZE + results.items.length
      : Math.min(currentPage * PAGE_SIZE, results.totalItems)
    : 0;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-none">
              {areaLabel} Reconciliation Results
            </h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              Review the run summary and matching details
            </p>
          </div>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete all {areaLabel.toLowerCase()} data?</DialogTitle>
                <DialogDescription>
                  This will permanently delete all uploaded {areaLabel.toLowerCase()} test
                  data. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="items-center sm:justify-center">
                <DialogClose asChild>
                  <Button variant="outline" disabled={deleting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={handleDeleteData}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {deleting ? "Deleting..." : "Delete Data"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => router.push(previewPath)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
          {!runLoaded ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-52 w-full" />
                ))}
              </div>
            </div>
          ) : !hasValidRunId ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Run information is missing</AlertTitle>
              <AlertDescription>
                Start a reconciliation from the Preview page to view its results.
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push(previewPath)}
                >
                  Return to Preview
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card className="gap-4 py-5">
                <CardHeader className="gap-3 px-5 md:grid-cols-[1fr_auto] md:px-6">
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      Run #{run.runId}
                      {run.status ? <Badge variant="outline">{run.status}</Badge> : null}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Completed reconciliation summary
                    </CardDescription>
                  </div>
                  <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Started</p>
                      <p className="font-medium">{formatDate(run.startedAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">{formatDate(run.completedAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {area === "acquiring" ? "Reversal pairs" : "Reversals deleted"}
                      </p>
                      <p className="font-medium">
                        {(area === "acquiring"
                          ? run.reversalCount
                          : run.reverseTransactionsDeleted
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <section aria-labelledby="summary-heading">
                <div className="mb-4">
                  <h2 id="summary-heading" className="text-base font-semibold">
                    Results summary
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select a category to view its transaction records.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Card
                        key={category.status}
                        className={
                          selectedStatus === category.status
                            ? "border-primary/50 ring-2 ring-primary/10"
                            : undefined
                        }
                      >
                        <CardHeader className="flex flex-col items-center text-center">
                          <div className="flex flex-col items-center">
                            <CardDescription>{category.title}</CardDescription>
                            <CardTitle className="mt-3 text-3xl tabular-nums">
                              {run[category.countKey].toLocaleString()}
                            </CardTitle>
                          </div>
                          <div
                            className={`flex items-center justify-center rounded-lg p-2.5 ${category.iconClassName}`}
                            aria-hidden="true"
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                        </CardHeader>
                        <CardFooter>
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled={detailsLoading}
                            onClick={() => loadDetails(category.status, 1)}
                          >
                            {detailsLoading && selectedStatus === category.status ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            View Details
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>

              {selectedCategory ? (
                <section ref={detailsRef} aria-labelledby="details-heading">
                  <Card className="min-w-0 gap-0 overflow-hidden py-0">
                    <CardHeader className="flex-row items-center justify-between border-b py-5">
                      <div>
                        <CardTitle id="details-heading">
                          {selectedCategory.title} Details
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Run #{run.runId} · {selectedCategory.status}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {area === "issuing" ? <><select
                          aria-label="Currency filter"
                          value={currency}
                          onChange={(event) => {
                            const nextCurrency = event.target.value as CurrencyFilter;
                            const nextCategory =
                              nextCurrency === "BDT" && category === "PREAUTH"
                                ? "ATM"
                                : category;
                            setCurrency(nextCurrency);
                            setCategory(nextCategory);
                            if (selectedStatus) {
                              void loadDetails(selectedStatus, 1, nextCurrency, nextCategory);
                            }
                          }}
                          className="h-9 rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="ALL">All currencies</option>
                          <option value="USD">USD</option>
                          <option value="BDT">BDT</option>
                        </select>
                        <select
                          aria-label="Category filter"
                          value={category}
                          onChange={(event) => {
                            const nextCategory = event.target.value as CategoryFilter;
                            setCategory(nextCategory);
                            if (selectedStatus) {
                              void loadDetails(selectedStatus, 1, currency, nextCategory);
                            }
                          }}
                          className="h-9 rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="ALL">All categories</option>
                          <option value="ATM">ATM</option>
                          <option value="POS">POS / Purchase</option>
                          <option value="PREAUTH" disabled={currency === "BDT"}>Preauth</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          From
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                          />
                        </label></> : null}
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          To
                          <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(event) => setDateTo(event.target.value)}
                            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                          />
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            exporting ||
                            detailsLoading ||
                            Boolean(detailsError) ||
                            !results?.items.length
                          }
                          onClick={exportDetails}
                        >
                          {exporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          {exporting ? "Exporting..." : "Export Excel"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={closeDetails}>
                          Back to Summary
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      {detailsError ? (
                        <div className="p-6">
                          <Alert variant="destructive">
                            <CircleAlert />
                            <AlertTitle>Unable to load details</AlertTitle>
                            <AlertDescription>
                              {detailsError}
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                disabled={detailsLoading}
                                onClick={() => loadDetails(selectedCategory.status, currentPage)}
                              >
                                Try Again
                              </Button>
                            </AlertDescription>
                          </Alert>
                        </div>
                      ) : detailsLoading ? (
                        <div className="space-y-3 p-6">
                          {Array.from({ length: 8 }).map((_, index) => (
                            <Skeleton key={index} className="h-9 w-full" />
                          ))}
                        </div>
                      ) : results && results.items.length > 0 ? (
                        <div>
                          {area === "issuing" && selectedStatus === "MATCHED" ? (
                            <div className="border-b p-4">
                              <Tabs
                                value={matchedSource}
                                onValueChange={(value) =>
                                  setMatchedSource(value as ResultDataSource)
                                }
                              >
                                <TabsList className="grid w-full max-w-sm grid-cols-2">
                                  <TabsTrigger value="cbs">CBS</TabsTrigger>
                                  <TabsTrigger value="bo">BO</TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>
                          ) : null}

                          <div className="w-full overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {columns.map((column) => (
                                    <TableHead key={column} className="whitespace-nowrap">
                                      {formatColumnLabel(column)}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {displayRows.map((item, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {columns.map((column) => (
                                      <TableCell key={column} className="max-w-80 whitespace-nowrap">
                                        <span className="block truncate" title={formatCellValue(item[column])}>
                                          {formatCellValue(item[column])}
                                        </span>
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
                          <DatabaseZap className="h-9 w-9 text-muted-foreground" />
                          <p className="font-medium">No records found</p>
                          <p className="text-sm text-muted-foreground">
                            This run has no {selectedCategory.title.toLowerCase()} records.
                          </p>
                        </div>
                      )}
                    </CardContent>

                    {results && !detailsError ? (
                      <CardFooter className="flex-col justify-between gap-3 border-t py-4 sm:flex-row">
                        <p className="text-sm text-muted-foreground">
                          {results.totalItems !== undefined
                            ? `Showing ${fromRecord} to ${toRecord} of ${results.totalItems.toLocaleString()} records`
                            : `Showing ${results.items.length.toLocaleString()} records on this page`}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            Page <strong>{currentPage}</strong>
                            {results.totalPages !== undefined ? (
                              <> of <strong>{results.totalPages}</strong></>
                            ) : null}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={detailsLoading || currentPage <= 1}
                            onClick={() => loadDetails(selectedCategory.status, currentPage - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={detailsLoading || !results.hasNextPage}
                            onClick={() => loadDetails(selectedCategory.status, currentPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </CardFooter>
                    ) : null}
                  </Card>
                </section>
              ) : null}
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function ReconciliationResultsPage() {
  return <ReconciliationResultsContent />;
}
