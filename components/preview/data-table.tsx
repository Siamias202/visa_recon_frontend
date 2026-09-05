"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  VisibilityState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton";


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];

  data: TData[];

  loading: boolean;


  sorting: SortingState;

  onSortingChange: React.Dispatch<
    React.SetStateAction<SortingState>
  >;


  columnVisibility: VisibilityState;

  onColumnVisibilityChange: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >;


  search: string;

  setSearch: (value: string) => void;
}



export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  search,
  setSearch,
}: DataTableProps<TData, TValue>) {


  const table = useReactTable({

    data: data ?? [],

    columns: columns ?? [],


    state: {

      sorting,

      columnVisibility,

    },


    manualSorting: true,


    onSortingChange,


    onColumnVisibilityChange,


    getCoreRowModel:
      getCoreRowModel(),

  });



  const rowModel =
    table.getRowModel();



  return (
    <div className="overflow-hidden">
      <div className="rounded-lg border">
        <div className="overflow-x-auto overflow-y-hidden">
          <Table className="min-w-[1200px]">


            <TableHeader>

              {
                table
                  .getHeaderGroups()
                  .map((headerGroup) => (

                    <TableRow
                      key={headerGroup.id}
                    >

                      {
                        headerGroup.headers.map(
                          (header) => (

                            <TableHead
                              key={header.id}
                              className="whitespace-nowrap"
                            >

                              {
                                header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column
                                        .columnDef.header,
                                      header.getContext()
                                    )
                              }

                            </TableHead>

                          )
                        )
                      }

                    </TableRow>

                  ))
              }

            </TableHeader>




            <TableBody>


              {
                loading ? (

                  Array
                    .from({
                      length: 10,
                    })
                    .map((_, index) => (

                      <TableRow
                        key={index}
                      >

                        {
                          columns.map(
                            (_, i) => (

                              <TableCell
                                key={i}
                              >

                                <Skeleton
                                  className="h-5 w-full"
                                />

                              </TableCell>

                            )
                          )
                        }

                      </TableRow>

                    ))


                ) : rowModel.rows.length ? (


                  rowModel.rows.map((row) => (

                    <TableRow
                      key={row.id}
                    >

                      {
                        row
                          .getVisibleCells()
                          .map((cell) => (

                            <TableCell
                              key={cell.id}
                              className="whitespace-nowrap"
                            >

                              {
                                flexRender(
                                  cell.column
                                    .columnDef.cell,
                                  cell.getContext()
                                )
                              }

                            </TableCell>

                          ))
                      }


                    </TableRow>

                  ))


                ) : (


                  <TableRow>

                    <TableCell
                      colSpan={columns.length}
                      className="h-32 text-center"
                    >

                      No data found

                    </TableCell>


                  </TableRow>


                )
              }


            </TableBody>


          </Table>


        </div>


      </div>


    </div>

  );

}