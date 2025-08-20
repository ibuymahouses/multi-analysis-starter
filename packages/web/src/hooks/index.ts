/**
 * Custom hooks index for the Multi-Analysis application
 * Export all custom hooks from this central location
 */

// Business logic hooks
export { usePropertyAnalysis } from './usePropertyAnalysis';
export { useListings } from './useListings';

// Form handling hooks
export { 
  useFormInput, 
  useCurrencyInput, 
  usePercentageInput, 
  useNumberInput, 
  useTextInput 
} from './useFormInput';

// State management hooks
export { 
  useUndoRedo, 
  usePropertyUndoRedo, 
  useFormUndoRedo 
} from './useUndoRedo';

// Re-export commonly used hooks for convenience
export type { UsePropertyAnalysisOptions } from './usePropertyAnalysis';
export type { UseListingsOptions } from './useListings';
export type { UseFormInputOptions } from './useFormInput';
export type { UseUndoRedoOptions } from './useUndoRedo';
