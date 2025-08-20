/**
 * Utility hook for form input handling
 * Reduces repetitive code in form components
 */

import { useState, useCallback } from 'react';

export interface UseFormInputOptions<T> {
  initialValue: T;
  validator?: (value: T) => string | null;
  formatter?: (value: T) => string;
  parser?: (value: string) => T;
}

export function useFormInput<T>(options: UseFormInputOptions<T>) {
  const { initialValue, validator, formatter, parser } = options;
  
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Update value
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    
    // Validate if touched
    if (touched && validator) {
      const validationError = validator(newValue);
      setError(validationError);
    }
  }, [touched, validator]);

  // Handle string input (for form fields)
  const handleStringInput = useCallback((inputValue: string) => {
    if (parser) {
      const parsedValue = parser(inputValue);
      updateValue(parsedValue);
    } else {
      // Default string handling
      updateValue(inputValue as T);
    }
  }, [parser, updateValue]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    setTouched(true);
    if (validator) {
      const validationError = validator(value);
      setError(validationError);
    }
  }, [value, validator]);

  // Reset input
  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  // Get formatted value for display
  const formattedValue = formatter ? formatter(value) : String(value);

  return {
    value,
    error,
    touched,
    formattedValue,
    updateValue,
    handleStringInput,
    handleBlur,
    reset,
    setTouched,
  };
}

// Specialized hooks for common input types
export function useCurrencyInput(initialValue: number = 0) {
  return useFormInput({
    initialValue,
    formatter: (value) => new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value)),
    parser: (value) => {
      const cleanValue = value.replace(/[$,]/g, '');
      return parseFloat(cleanValue) || 0;
    },
    validator: (value) => value < 0 ? 'Value must be positive' : null,
  });
}

export function usePercentageInput(initialValue: number = 0) {
  return useFormInput({
    initialValue,
    formatter: (value) => `${(value * 100).toFixed(1)}%`,
    parser: (value) => {
      const cleanValue = value.replace(/%/g, '');
      return (parseFloat(cleanValue) || 0) / 100;
    },
    validator: (value) => value < 0 || value > 1 ? 'Percentage must be between 0% and 100%' : null,
  });
}

export function useNumberInput(initialValue: number = 0, min?: number, max?: number) {
  return useFormInput({
    initialValue,
    parser: (value) => parseFloat(value) || 0,
    validator: (value) => {
      if (min !== undefined && value < min) return `Value must be at least ${min}`;
      if (max !== undefined && value > max) return `Value must be at most ${max}`;
      return null;
    },
  });
}

export function useTextInput(initialValue: string = '', required: boolean = false) {
  return useFormInput({
    initialValue,
    validator: (value) => {
      if (required && !value.trim()) return 'This field is required';
      return null;
    },
  });
}
