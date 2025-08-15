import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, ChevronUp, ChevronDown, ChevronsUpDown, Filter, MoreHorizontal, Copy, Check, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ExcelFilterDropdown } from "./excel-filter-dropdown"

interface Column {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  editable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  align?: 'left' | 'right' | 'center'
  type?: 'text' | 'number' | 'date' | 'select'
  options?: string[] // For select type
  render?: (value: any, row: any, isEditing: boolean, onEdit: (value: any) => void) => React.ReactNode
  format?: (value: any) => string
}

interface ExcelStyleTableProps {
  columns: Column[]
  data: any[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  filters: Record<string, any>
  onFilterChange: (field: string, value: any) => void
  onClearFilter: (field: string) => void
  onClearAllFilters: () => void
  onRowSelect?: (selectedRows: any[]) => void
  onCellEdit?: (rowIndex: number, field: string, value: any) => void
  selectable?: boolean
  copyable?: boolean
}

interface FilterConfig {
  type: 'text' | 'number' | 'select' | 'range' | 'multiple'
  value: any
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between'
  secondValue?: any // For range filters
}

export function ExcelStyleTable({
  columns,
  data,
  sortField,
  sortDirection,
  onSort,
  filters,
  onFilterChange,
  onClearFilter,
  onClearAllFilters,
  onRowSelect,
  onCellEdit,
  selectable = false,
  copyable = true
}: ExcelStyleTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [filterPopovers, setFilterPopovers] = useState<Set<string>>(new Set())
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Initialize column widths
  useEffect(() => {
    const widths: Record<string, number> = {}
    columns.forEach(col => {
      widths[col.key] = col.width || 150
    })
    setColumnWidths(widths)
  }, [columns])







  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const handleRowSelect = (rowIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(rowIndex)
    } else {
      newSelected.delete(rowIndex)
    }
    setSelectedRows(newSelected)
    onRowSelect?.(data.filter((_, i) => newSelected.has(i)))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSelected = new Set(data.map((_, i) => i))
      setSelectedRows(allSelected)
      onRowSelect?.(data)
    } else {
      setSelectedRows(new Set())
      onRowSelect?.([])
    }
  }

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    onCellEdit?.(rowIndex, field, value)
    setEditingCell(null)
  }

  const handleCopySelection = async () => {
    if (selectedRows.size === 0) return

    const selectedData = data.filter((_, i) => selectedRows.has(i))
    const csvContent = [
      columns.map(col => col.label).join('\t'),
      ...selectedData.map(row => 
        columns.map(col => {
          const value = row[col.key]
          return col.format ? col.format(value) : String(value || '')
        }).join('\t')
      )
    ].join('\n')

    try {
      await navigator.clipboard.writeText(csvContent)
      // Show success feedback
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleColumnResize = (columnKey: string, newWidth: number) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column) return

    const minWidth = column.minWidth || 80
    const maxWidth = column.maxWidth || 400
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: clampedWidth
    }))
  }

  const getFilterComponent = (column: Column) => {
    const filterValue = filters[column.key]
    
    switch (column.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <Select 
              value={filterValue?.operator || 'equals'} 
              onValueChange={(operator) => onFilterChange(column.key, { ...filterValue, operator })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="greaterThan">Greater than</SelectItem>
                <SelectItem value="lessThan">Less than</SelectItem>
                <SelectItem value="between">Between</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Value"
              value={filterValue?.value || ''}
              onChange={(e) => onFilterChange(column.key, { ...filterValue, value: e.target.value })}
              className="h-8"
            />
            {filterValue?.operator === 'between' && (
              <Input
                type="number"
                placeholder="Second value"
                value={filterValue?.secondValue || ''}
                onChange={(e) => onFilterChange(column.key, { ...filterValue, secondValue: e.target.value })}
                className="h-8"
              />
            )}
          </div>
        )
      
      case 'select':
        return (
          <div className="space-y-2">
            <Select 
              value={filterValue || 'all'} 
              onValueChange={(value) => onFilterChange(column.key, value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {column.options?.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      
      default:
        return (
          <div className="space-y-2">
            <Select 
              value={filterValue?.operator || 'contains'} 
              onValueChange={(operator) => onFilterChange(column.key, { ...filterValue, operator })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="startsWith">Starts with</SelectItem>
                <SelectItem value="endsWith">Ends with</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Filter value"
              value={filterValue?.value || ''}
              onChange={(e) => onFilterChange(column.key, { ...filterValue, value: e.target.value })}
              className="h-8"
            />
          </div>
        )
    }
  }

  const hasActiveFilters = Object.values(filters).some(filter => {
    if (Array.isArray(filter)) return filter.length > 0
    if (typeof filter === 'string') return filter.trim() !== ''
    if (typeof filter === 'object') return filter.value || filter.secondValue
    return false
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectable && (
            <span className="text-sm text-muted-foreground">
              {selectedRows.size} of {data.length} selected
            </span>
          )}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearAllFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {copyable && selectedRows.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleCopySelection}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Selection
            </Button>
          )}
        </div>
      </div>

      {/* Excel-style Table with Sticky Headers */}
      <div 
        ref={tableRef}
        className="border border-gray-300 rounded-lg overflow-hidden bg-white"
        style={{ 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}
      >
                <div className="overflow-x-auto max-h-[1152px]">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {selectable && (
                  <th className="border-r border-gray-200 p-0 bg-gray-50" style={{ width: 40, backgroundColor: '#f9fafb' }}>
                    <div className="p-2">
                      <Checkbox
                        checked={selectedRows.size === data.length && data.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </div>
                  </th>
                )}
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className="border-r border-gray-200 p-0 relative bg-gray-50"
                    style={{ 
                      width: columnWidths[column.key] || column.width || 150,
                      minWidth: column.minWidth || 80,
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-700 truncate">
                          {column.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {column.sortable && (
                            <button
                              onClick={() => onSort(column.key)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title={`Sort by ${column.label}`}
                            >
                              {getSortIcon(column.key)}
                            </button>
                          )}
                          {column.filterable && (
                            <ExcelFilterDropdown
                              column={{
                                id: column.key,
                                header: column.label,
                                data: data.map(row => row[column.key])
                              }}
                              onFilterChange={onFilterChange}
                              onSortChange={onSort}
                              currentFilter={Array.isArray(filters[column.key]) ? filters[column.key] : (filters[column.key] ? [filters[column.key]] : [])}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Column resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400"
                      onMouseDown={(e) => {
                        setResizingColumn(column.key)
                        e.preventDefault()
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  data-row-index={rowIndex}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                    selectedRows.has(rowIndex) && "bg-blue-50 hover:bg-blue-100"
                  )}
                >
                  {selectable && (
                    <td className="border-r border-gray-200 p-0">
                      <div className="p-2">
                        <Checkbox
                          checked={selectedRows.has(rowIndex)}
                          onCheckedChange={(checked) => handleRowSelect(rowIndex, checked as boolean)}
                        />
                      </div>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className={cn(
                        "border-r border-gray-100 p-2 text-sm",
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        editingCell?.row === rowIndex && editingCell?.col === column.key && 'bg-blue-50 border-blue-300'
                      )}
                      style={{ 
                        width: columnWidths[column.key] || column.width || 150,
                        minWidth: column.minWidth || 80
                      }}
                      onDoubleClick={() => {
                        if (column.editable) {
                          setEditingCell({ row: rowIndex, col: column.key })
                        }
                      }}
                    >
                      {column.render ? 
                        column.render(
                          row[column.key], 
                          row, 
                          editingCell?.row === rowIndex && editingCell?.col === column.key,
                          (value) => handleCellEdit(rowIndex, column.key, value)
                        ) : 
                        (editingCell?.row === rowIndex && editingCell?.col === column.key) ?
                          <Input
                            value={row[column.key] || ''}
                            onChange={(e) => handleCellEdit(rowIndex, column.key, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(rowIndex, column.key, e.currentTarget.value)
                              } else if (e.key === 'Escape') {
                                setEditingCell(null)
                              }
                            }}
                            className="h-6 text-sm"
                            autoFocus
                          /> :
                          <span className="truncate block">
                            {column.format ? column.format(row[column.key]) : String(row[column.key] || '')}
                          </span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column resize overlay */}
      {resizingColumn && (
        <div
          className="fixed inset-0 z-50 cursor-col-resize"
          onMouseMove={(e) => {
            if (resizingColumn && tableRef.current) {
              const rect = tableRef.current.getBoundingClientRect()
              const newWidth = e.clientX - rect.left
              handleColumnResize(resizingColumn, newWidth)
            }
          }}
          onMouseUp={() => setResizingColumn(null)}
        />
      )}
    </div>
  )
}
