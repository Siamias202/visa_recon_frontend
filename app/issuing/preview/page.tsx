"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListFilter, Loader2, Play } from "lucide-react";
import {
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import { AppSidebar } from "@/components/app-sidebar";
import {
  acquiringEpColumns,
  acquiringFeColumns,
  boColumns,
  columns,
} from "@/components/preview/columns";
import { DataTable } from "@/components/preview/data-table";
import { DataTablePagination } from "@/components/preview/pagination";

import { getPreview } from "@/lib/api/preview";
import { runReconciliation } from "@/lib/api/reconciliation";
import { storeReconciliationRun } from "@/lib/reconciliation-run-storage";
import { PreviewRecord, PreviewType } from "@/types/preview";
import {
  TransactionCategory,
  TransactionCurrency,
} from "@/lib/transaction-filters";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PreviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const area = pathname.startsWith("/acquiring") ? "acquiring" : "issuing";
  const areaLabel = area === "acquiring" ? "Acquiring" : "Issuing";
  const [data, setData] = React.useState<PreviewRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const runInProgress = React.useRef(false);
  const [previewType, setPreviewType] = React.useState<PreviewType>(
    area === "acquiring" ? "gl" : "cbs",
  );
  const [currency, setCurrency] = React.useState<TransactionCurrency | null>(null);
  const [category, setCategory] = React.useState<TransactionCategory | null>(null);

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [totalItems, setTotalItems] = React.useState(0);

  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);

    return () => clearTimeout(timer);
  }, [area, category, currency, page, pageSize, previewType, search, sorting]);

  const sortableFields = new Set([
    "id",
    "posting_date",
    "value_date",
    "amount",
    "request_amount",
    "amountbdt",
    "amountusd",
    "time_stamp",
    "rrn",
  ]);

  async function loadData() {
    try {
      setLoading(true);

      const activeSort = sorting[0];

      const sortBy =
        activeSort && sortableFields.has(activeSort.id)
          ? activeSort.id
          : null;

      const result = await getPreview(
        {
          type: previewType,
          page,
          pageSize,
          searchQuery: search || null,
          sortBy,
          sortDirection:
            sortBy && activeSort?.desc
              ? "desc"
              : sortBy
                ? "asc"
                : null,
          ...(area === "issuing"
            ? {
                currency,
                category,
              }
            : {}),
        },
        area,
      );

      setData(result.items);
      setTotalItems(result.totalItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setSorting([]);
    setColumnVisibility({});
    setCurrency(null);
    setCategory(null);
    setPage(1);
  };

  const handleRun = async () => {
    if (runInProgress.current) return;

    runInProgress.current = true;
    setRunning(true);

    try {
      const result = await runReconciliation(area);
      storeReconciliationRun(area, result);
      toast.success(`Reconciliation run ${result.runId} completed`);
      router.push(`/${area}/output`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to run reconciliation",
      );
    } finally {
      runInProgress.current = false;
      setRunning(false);
    }
  };

  const handlePreviewTypeChange = (value: string) => {
    const validTypes =
      area === "acquiring" ? ["gl", "fe", "ep"] : ["cbs", "bo"];
    if (!validTypes.includes(value)) return;

    setPreviewType(value as PreviewType);
    setPage(1);
    setSearch("");
    setSorting([]);
    setColumnVisibility({});
  };

  const activeColumns =
    previewType === "bo"
      ? boColumns
      : previewType === "fe"
        ? acquiringFeColumns
        : previewType === "ep"
          ? acquiringEpColumns
          : columns;

  /*
   * Columns available in the Columns dropdown.
   */
  const selectableColumns = activeColumns.filter(
    (
      column,
    ): column is (typeof activeColumns)[number] & {
      accessorKey: string;
    } =>
      "accessorKey" in column &&
      typeof column.accessorKey === "string"
  );

  const getColumnLabel = (
    column: (typeof activeColumns)[number]
  ) => {
    if (
      "header" in column &&
      typeof column.header === "string"
    ) {
      return column.header;
    }

    if (
      "accessorKey" in column &&
      column.accessorKey
    ) {
      return String(column.accessorKey)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
          char.toUpperCase()
        );
    }

    return "Column";
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-w-0">
        {/* Navbar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />

          <Separator
            orientation="vertical"
            className="mr-2 h-4"
          />

          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-none">
              {areaLabel} Data Preview
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              View, search, sort, and manage uploaded transactions
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
          <Tabs value={previewType} onValueChange={handlePreviewTypeChange} className="w-full">
            <TabsList className={`grid w-full ${area === "acquiring" ? "grid-cols-3" : "grid-cols-2"}`}>
              {area === "acquiring" ? (
                <>
                  <TabsTrigger value="gl">GL Preview</TabsTrigger>
                  <TabsTrigger value="fe">FE Preview</TabsTrigger>
                  <TabsTrigger value="ep">EP Preview</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="cbs">CBS Preview</TabsTrigger>
                  <TabsTrigger value="bo">CMS/BO Preview</TabsTrigger>
                </>
              )}
            </TabsList>

            {(area === "acquiring" ? ["gl", "fe", "ep"] : ["cbs", "bo"]).map((previewType) => (
              <TabsContent
                key={previewType}
                value={previewType}
                className="mt-6 flex min-w-0 flex-col gap-5"
              >

          {/* Fixed Toolbar */}
        <div className="flex w-full shrink-0 items-center justify-between gap-2">
          {/* Filters - Left */}
          {area === "issuing" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filters
                  {(currency ? 1 : 0) + (category ? 1 : 0) > 0
                    ? ` (${(currency ? 1 : 0) + (category ? 1 : 0)})`
                    : ""}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Currency</DropdownMenuLabel>
                {(["BDT", "USD"] as const).map((value) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={currency === value}
                    onCheckedChange={() => {
                      setCurrency((current) => current === value ? null : value);
                      setPage(1);
                    }}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {value}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Category</DropdownMenuLabel>
                {(["ATM", "POS", "PREAUTH"] as const).map((value) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={category === value}
                    onCheckedChange={() => {
                      setCategory((current) => current === value ? null : value);
                      setPage(1);
                    }}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {value === "POS"
                      ? "POS / Purchase"
                      : value === "PREAUTH"
                        ? "Pre-Auth"
                        : value}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Search - Middle */}
          <div className="min-w-0 flex-1">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) =>
                handleSearchChange(e.target.value)
              }
              className="h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>

            {/* Columns + Reset + Run - Right */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Columns */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                  >
                    Columns
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56"
                >
                  <DropdownMenuLabel>
                    Select Columns
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  {selectableColumns.map((column) => {
                    const key = String(column.accessorKey);

                    const checked =
                      columnVisibility[key] !== false;

                    return (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={checked}
                        onCheckedChange={(value) => {
                          setColumnVisibility((previous) => ({
                            ...previous,
                            [key]: value === true,
                          }));
                        }}
                        onSelect={(event) => {
                          event.preventDefault();
                        }}
                      >
                        {getColumnLabel(column)}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reset */}
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleReset}
              >
                Reset
              </Button>

              <Button
                size="sm"
                className="h-9"
                onClick={handleRun}
                disabled={running}
              >
                {running ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {running ? "Running..." : "Run"}
              </Button>
            </div>
          </div>

          {/* Table Area */}
          <div className="min-w-0 overflow-hidden rounded-lg border bg-background">

            {/* ONLY TABLE IS HORIZONTALLY SCROLLABLE */}
            <div className="w-full overflow-x-auto">
              <DataTable
                columns={activeColumns}
                data={data}
                loading={loading}
                sorting={sorting}
                onSortingChange={setSorting}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={
                  setColumnVisibility
                }
                search={search}
                setSearch={handleSearchChange}
              />
            </div>
          </div>

          {/* Pagination */}
          <div className="shrink-0">
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={totalItems}
              onPageChange={setPage}
              onPageSizeChange={
                handlePageSizeChange
              }
            />
          </div>
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
