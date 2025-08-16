import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { API_ENDPOINTS } from '../../lib/config';

// Import AG Grid styles
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

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

export default function TestAGGridPage() {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('AG Grid: Loading data...');
        const response = await fetch(API_ENDPOINTS.analyzeAll('avg'));
        const result = await response.json();
        console.log('AG Grid: Data loaded, rows:', result.rows?.length);
        setData(result.rows || []);
      } catch (error) {
        console.error('AG Grid: Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Define columns
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'LIST_NO',
      headerName: 'MLS #',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith', 'endsWith'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: (params: any) => {
        return (
          <Link 
            href={`/property/${params.value}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {params.value}
          </Link>
        );
      },
    },
    {
      field: 'ADDRESS',
      headerName: 'Address',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith', 'endsWith'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: (params: any) => {
        return (
          <Link 
            href={`/property/${params.data.LIST_NO}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {params.value}
          </Link>
        );
      },
    },
    {
      field: 'TOWN',
      headerName: 'Town',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith', 'endsWith'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    {
      field: 'LIST_PRICE',
      headerName: 'List Price',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      valueFormatter: (params: any) => {
        return `$${params.value?.toLocaleString() || '0'}`;
      },
    },
    {
      field: 'UNITS_FINAL',
      headerName: 'Units',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    {
      field: 'NO_UNITS_MF',
      headerName: 'MF Units',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    {
      field: 'analysis.monthlyGross',
      headerName: 'Monthly Rent',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: (params: any) => {
        const monthlyRent = params.value || 0;
        const listPrice = params.data.LIST_PRICE || 0;
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
    },
    {
      field: 'analysis.noi',
      headerName: 'NOI (yr)',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      valueFormatter: (params: any) => {
        return `$${params.value?.toLocaleString() || '0'}`;
      },
    },
    {
      field: 'analysis.capAtAsk',
      headerName: 'Cap @ Ask',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      valueFormatter: (params: any) => {
        return `${params.value || 0}%`;
      },
    },
    {
      field: 'analysis.dscr',
      headerName: 'DSCR',
      sortable: true,
      filter: true,
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      valueFormatter: (params: any) => {
        return (params.value || 0).toFixed(2);
      },
    },
  ], []);

  // Grid ready event
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">AG Grid Test</h1>
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
        <h1 className="text-3xl font-bold">AG Grid Test - Excel-like Filtering</h1>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          This is AG Grid with Excel-like filtering. Try:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mb-4">
          <li>Click the filter icon (🔽) next to any column header</li>
          <li>Use the search box to find specific values</li>
          <li>Check/uncheck values to filter (like Excel!)</li>
          <li>Use "Select All" to toggle all visible values</li>
          <li>Use different filter types (contains, equals, greater than, etc.)</li>
          <li>Sort by clicking column headers</li>
        </ul>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%', border: '2px solid red' }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={data}
          onGridReady={onGridReady}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
          }}
          animateRows={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          tooltipShowDelay={0}
          tooltipHideDelay={2000}
        />
      </div>

      {/* Table Info */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Showing {data.length} rows with Excel-like filtering capabilities
        </p>
        <p className="mt-1">
          <strong>Features:</strong> Multi-column sorting, range filters, text filters, 
          checkbox selection, pagination, column resizing
        </p>
      </div>
    </div>
  );
}
