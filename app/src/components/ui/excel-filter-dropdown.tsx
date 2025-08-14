import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

interface ExcelFilterDropdownProps {
  column: {
    id: string;
    header: string;
    data: any[];
  };
  onFilterChange: (columnId: string, selectedValues: string[]) => void;
  onSortChange?: (columnId: string, direction: 'asc' | 'desc' | null) => void;
  currentSort?: { id: string; direction: 'asc' | 'desc' } | null;
  currentFilter?: string[];
}

export function ExcelFilterDropdown({
  column,
  onFilterChange,
  onSortChange,
  currentSort,
  currentFilter = []
}: ExcelFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>(currentFilter);
  const [selectAll, setSelectAll] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get unique values from the column data
  const uniqueValues = React.useMemo(() => {
    const values = new Set<string>();
    column.data.forEach(item => {
      if (item !== null && item !== undefined) {
        values.add(String(item));
      }
    });
    return Array.from(values).sort();
  }, [column.data]);

  // Filter unique values based on search term
  const filteredValues = React.useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(value => 
      value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueValues, searchTerm]);

  // Update select all state
  useEffect(() => {
    const allFilteredSelected = filteredValues.every(value => 
      selectedValues.includes(value)
    );
    setSelectAll(allFilteredSelected);
  }, [filteredValues, selectedValues]);

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = [...new Set([...selectedValues, ...filteredValues])];
      setSelectedValues(newSelected);
    } else {
      const newSelected = selectedValues.filter(value => 
        !filteredValues.includes(value)
      );
      setSelectedValues(newSelected);
    }
  };

  // Handle individual value toggle
  const handleValueToggle = (value: string, checked: boolean) => {
    if (checked) {
      setSelectedValues(prev => [...prev, value]);
    } else {
      setSelectedValues(prev => prev.filter(v => v !== value));
    }
  };

  // Apply filter
  const handleApply = () => {
    onFilterChange(column.id, selectedValues);
    setIsOpen(false);
  };

  // Clear filter
  const handleClear = () => {
    setSelectedValues([]);
    onFilterChange(column.id, []);
    setIsOpen(false);
  };

  // Handle sort
  const handleSort = (direction: 'asc' | 'desc' | null) => {
    onSortChange?.(column.id, direction);
  };

  // Handle search key press
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Return') {
      e.preventDefault();
      // If there's a search term, filter for the filtered values (what's currently visible)
      if (searchTerm.trim() && filteredValues.length > 0) {
        setSelectedValues(filteredValues);
        // Use the same filter format as the rest of the system
        onFilterChange(column.id, filteredValues);
      }
      setIsOpen(false);
    }
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Reset search term when opening
      setSearchTerm('');
      // Focus the search input after a short delay
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 150);
    }
  }, [isOpen]);

  // Get sort icon
  const getSortIcon = () => {
    if (currentSort?.id !== column.id) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return currentSort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  // Check if filter is active
  const isFilterActive = selectedValues.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 hover:bg-muted",
            isFilterActive && "bg-blue-100 text-blue-600 hover:bg-blue-200"
          )}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter {column.header}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Sort</div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort('asc')}
                >
                  <ArrowUp className="h-3 w-3 mr-1" />
                  A to Z
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort('desc')}
                >
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Z to A
                </Button>
              </div>
            </div>
          </div>

          {/* Clear Filter Button */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
              disabled={!isFilterActive}
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filter
            </Button>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Search</div>
            <Input
              ref={searchInputRef}
              placeholder="Search values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="h-8"
            />
          </div>

          {/* Values List */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Values ({filteredValues.length})
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
              {/* Select All */}
              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={`select-all-${column.id}`}
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor={`select-all-${column.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  (Select All)
                </label>
              </div>

              {/* Individual Values */}
              {filteredValues.map((value) => (
                <div key={value} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`${column.id}-${value}`}
                    checked={selectedValues.includes(value)}
                    onCheckedChange={(checked) => 
                      handleValueToggle(value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`${column.id}-${value}`}
                    className="text-sm cursor-pointer truncate"
                    title={value}
                  >
                    {value}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
