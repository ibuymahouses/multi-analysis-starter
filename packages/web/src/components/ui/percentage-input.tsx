import React, { useState } from 'react';

interface PercentageInputProps {
  value: number; // Value as decimal (e.g., 0.05 for 5%)
  onChange: (value: number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  maxValue?: number; // Maximum percentage value (default 100)
  minValue?: number; // Minimum percentage value (default 0)
  precision?: number; // Decimal places (default 1)
}

export const PercentageInput: React.FC<PercentageInputProps> = ({
  value,
  onChange,
  placeholder = "0.0%",
  style = {},
  maxValue = 100,
  minValue = 0,
  precision = 1
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  const formatDisplayValue = (val: number): string => {
    return `${(val * 100).toFixed(precision)}%`;
  };

  const parseInputValue = (input: string): number | null => {
    const cleanValue = input.replace(/%/g, '').trim();
    if (cleanValue === '') return null;
    
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return null;
    
    return numValue / 100; // Convert percentage to decimal
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setInputValue(formatDisplayValue(value));
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsedValue = parseInputValue(e.target.value);
    
    if (parsedValue !== null) {
      // Validate range
      const percentageValue = parsedValue * 100;
      if (percentageValue >= minValue && percentageValue <= maxValue) {
        onChange(parsedValue);
      }
    }
    
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={inputValue || formatDisplayValue(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={{
        padding: '4px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        width: '80px',
        textAlign: 'right',
        fontSize: '14px',
        backgroundColor: '#f8f9fa',
        ...style
      }}
    />
  );
};
