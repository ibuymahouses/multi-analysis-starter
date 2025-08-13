import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown, 
  Filter,
  Search,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Column {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  align?: 'left' | 'right' | 'center'
  render?: (value: any, row: any) => React.ReactNode
}

interface ExcelStyleTableProps {
  columns: Column[]
  data: any[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  filters: Record<string, string[]>
  onFilterChange: (field: string, values: string[]) => void
  onClearFilter: (field: string) => void
  onClearAllFilters: () => void
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
  onClearAllFilters
}: ExcelStyleTableProps) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const hasActiveFilters = Object.values(filters).some(filter => filter.length > 0)

  // Get unique values for each column
  const getUniqueValues = (field: string) => {
    const values = new Set<string>()
    data.forEach(row => {
      const value = row[field]
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value))
      }
    })
    return Array.from(values).sort()
  }

  // Filter data based on current filters
  const filteredData = data.filter(row => {
    return Object.entries(filters).every(([field, filterValues]) => {
      if (filterValues.length === 0) return true
      const cellValue = String(row[field] || '')
      return filterValues.some(filterValue => 
        cellValue.toLowerCase().includes(filterValue.toLowerCase())
      )
    })
  })

  return (
    <div className="space-y-4">
      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {Object.entries(filters).map(([field, values]) => {
            if (values.length === 0) return null
            const column = columns.find(col => col.key === field)
            return (
              <Badge key={field} variant="secondary" className="gap-1">
                {column?.label}: {values.join(', ')}
                <button
                  onClick={() => onClearFilter(field)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                >
                  ×
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
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{column.label}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel>Sort & Filter</DropdownMenuLabel>
                        
                        {/* Sort Options */}
                        {column.sortable && (
                          <>
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => onSort(column.key)}>
                                <SortAsc className="mr-2 h-4 w-4" />
                                Sort A to Z
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSort(column.key)}>
                                <SortDesc className="mr-2 h-4 w-4" />
                                Sort Z to A
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {/* Filter Options */}
                        {column.filterable && (
                          <>
                            <DropdownMenuGroup>
                              <DropdownMenuItem 
                                onClick={() => onClearFilter(column.key)}
                                disabled={!filters[column.key] || filters[column.key].length === 0}
                              >
                                <Filter className="mr-2 h-4 w-4" />
                                Clear Filter from "{column.label}"
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            
                            {/* Search */}
                            <div className="p-2">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search..."
                                  className="pl-8"
                                  onChange={(e) => {
                                    const searchValue = e.target.value.toLowerCase()
                                    const uniqueValues = getUniqueValues(column.key)
                                    const filteredValues = uniqueValues.filter(value => 
                                      value.toLowerCase().includes(searchValue)
                                    )
                                    // This would need to be implemented with a more complex state management
                                    // For now, we'll just show the search input
                                  }}
                                />
                              </div>
                            </div>

                            {/* Filter Values */}
                            <div className="max-h-60 overflow-y-auto">
                              <ColumnFilterValues
                                column={column}
                                uniqueValues={getUniqueValues(column.key)}
                                selectedValues={filters[column.key] || []}
                                onSelectionChange={(values) => onFilterChange(column.key, values)}
                              />
                            </div>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
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

// Component for the filter values list
function ColumnFilterValues({ 
  column, 
  uniqueValues, 
  selectedValues, 
  onSelectionChange 
}: {
  column: Column
  uniqueValues: string[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
}) {
  const [selectAll, setSelectAll] = React.useState(true)

  React.useEffect(() => {
    setSelectAll(selectedValues.length === 0 || selectedValues.length === uniqueValues.length)
  }, [selectedValues, uniqueValues])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange([]) // Empty array means "show all"
    } else {
      onSelectionChange([]) // Keep empty to show all
    }
    setSelectAll(checked)
  }

  const handleValueToggle = (value: string, checked: boolean) => {
    if (checked) {
      // Add value to selection
      const newSelection = selectedValues.length === 0 ? uniqueValues : selectedValues
      onSelectionChange(newSelection.filter(v => v !== value))
    } else {
      // Remove value from selection
      const newSelection = selectedValues.filter(v => v !== value)
      onSelectionChange(newSelection.length === 0 ? [] : newSelection)
    }
  }

  const isValueSelected = (value: string) => {
    return selectedValues.length === 0 || selectedValues.includes(value)
  }

  return (
    <div className="p-2 space-y-1">
      <DropdownMenuCheckboxItem
        checked={selectAll}
        onCheckedChange={handleSelectAll}
        className="font-medium"
      >
        (Select All)
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {uniqueValues.map((value) => (
        <DropdownMenuCheckboxItem
          key={value}
          checked={isValueSelected(value)}
          onCheckedChange={(checked) => handleValueToggle(value, checked)}
        >
          {value}
        </DropdownMenuCheckboxItem>
      ))}
    </div>
  )
}
