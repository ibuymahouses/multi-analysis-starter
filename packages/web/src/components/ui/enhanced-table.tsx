import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Column {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  align?: 'left' | 'right' | 'center'
  render?: (value: any, row: any) => React.ReactNode
}

interface EnhancedTableProps {
  columns: Column[]
  data: any[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  filters: Record<string, string>
  onFilterChange: (field: string, value: string) => void
  onClearFilter: (field: string) => void
  onClearAllFilters: () => void
}

export function EnhancedTable({
  columns,
  data,
  sortField,
  sortDirection,
  onSort,
  filters,
  onFilterChange,
  onClearFilter,
  onClearAllFilters
}: EnhancedTableProps) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const hasActiveFilters = Object.values(filters).some(filter => filter.trim() !== '')

  return (
    <div className="space-y-4">
      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {Object.entries(filters).map(([field, value]) => {
            if (!value.trim()) return null
            const column = columns.find(col => col.key === field)
            return (
              <Badge key={field} variant="secondary" className="gap-1">
                {column?.label}: {value}
                <button
                  onClick={() => onClearFilter(field)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button variant="outline" size="sm" onClick={onClearAllFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn(
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center'
                )}>
                  <div className="space-y-2">
                    {/* Header with sort button */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{column.label}</span>
                      {column.sortable && (
                        <button
                          onClick={() => onSort(column.key)}
                          className="p-1 hover:bg-muted rounded"
                          title={`Sort by ${column.label}`}
                        >
                          {getSortIcon(column.key)}
                        </button>
                      )}
                    </div>
                    
                    {/* Filter input */}
                    {column.filterable && (
                      <div className="relative">
                        <Input
                          placeholder={`Filter ${column.label}...`}
                          value={filters[column.key] || ''}
                          onChange={(e) => onFilterChange(column.key, e.target.value)}
                          className="h-8 text-sm"
                        />
                        {filters[column.key] && (
                          <button
                            onClick={() => onClearFilter(column.key)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn(
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center'
                  )}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
