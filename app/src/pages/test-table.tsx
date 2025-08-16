import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../lib/config';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  FilterFn,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

// Define the data type
type Property = {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  LIST_PRICE: number;
  UNITS_FINAL: number;
  NO_UNITS_MF: number;
  UNIT_MIX?: Array<{
    bedrooms: number;
    count: number;
  }>;
  analysis: {
    monthlyGross: number;
    noi: number;
    capAtAsk: number;
    dscr: number;
  };
};

const columnHelper = createColumnHelper<Property>();

export default function TestTablePage() {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.analyzeAll('avg'));
        const result = await response.json();
        setData(result.rows || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Define columns
  const columns = [
    columnHelper.accessor('LIST_NO', {
      header: 'MLS #',
      cell: ({ row }) => (
        <Link 
          href={`/property/${row.original.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.LIST_NO}
        </Link>
      ),
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('ADDRESS', {
      header: 'Address',
      cell: ({ row }) => (
        <Link 
          href={`/property/${row.original.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.ADDRESS}
        </Link>
      ),
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('TOWN', {
      header: 'Town',
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('LIST_PRICE', {
      header: 'List Price',
      cell: ({ getValue }) => `$${getValue().toLocaleString()}`,
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('UNITS_FINAL', {
      header: 'Units',
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('NO_UNITS_MF', {
      header: 'MF Units',
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('analysis.monthlyGross', {
      header: 'Monthly Rent',
      cell: ({ getValue, row }) => {
        const monthlyRent = getValue();
        const listPrice = row.original.LIST_PRICE;
        const onePercentRatio = listPrice > 0 ? (monthlyRent / listPrice) * 100 : 0;
        const passesOnePercent = monthlyRent >= listPrice * 0.01;
        
        return (
          <div>
            <div>
              {monthlyRent.toLocaleString()}
              {passesOnePercent && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  1%
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {onePercentRatio.toFixed(1)}%
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('analysis.noi', {
      header: 'NOI (yr)',
      cell: ({ getValue }) => `$${getValue().toLocaleString()}`,
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('analysis.capAtAsk', {
      header: 'Cap @ Ask',
      cell: ({ getValue }) => `${getValue()}%`,
      enableSorting: true,
      enableColumnFilter: true,
    }),
    columnHelper.accessor('analysis.dscr', {
      header: 'DSCR',
      cell: ({ getValue }) => getValue().toFixed(2),
      enableSorting: true,
      enableColumnFilter: true,
    }),
  ];

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">TanStack Table Test</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/listings">
          <Button variant="outline" size="sm">
            ← Back to Original Table
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">TanStack Table Test</h1>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          This is a test of TanStack Table with advanced filtering. Try:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mb-4">
          <li>Click column headers to sort</li>
          <li>Use the filter inputs below the headers</li>
          <li>Try different filter types (text, numbers)</li>
        </ul>
      </div>

      {/* Global Filter */}
      <div className="mb-4">
        <Input
          placeholder="Search all columns..."
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-2 text-left font-medium">
                    <div className="space-y-2">
                      {/* Header */}
                      <div
                        className={`flex items-center gap-2 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      
                      {/* Filter Input */}
                      {header.column.getCanFilter() && (
                        <div>
                          <Input
                            placeholder={`Filter ${header.column.columnDef.header as string}...`}
                            value={(header.column.getFilterValue() as string) ?? ''}
                            onChange={(event) =>
                              header.column.setFilterValue(event.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Info */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Showing {table.getFilteredRowModel().rows.length} of {table.getPreFilteredRowModel().rows.length} rows
        </p>
        {table.getState().columnFilters.length > 0 && (
          <p>Filters applied: {table.getState().columnFilters.length}</p>
        )}
      </div>
    </div>
  );
}
