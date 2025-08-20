/**
 * Enhanced undo/redo hook with better state management
 * Replaces the existing undo-redo-context with improved functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UndoRedoState<T> {
  type: string;
  data: T;
  timestamp: number;
  description?: string;
}

export interface UseUndoRedoOptions<T> {
  initialState: T;
  maxHistory?: number;
  debounceMs?: number;
  onStateChange?: (state: T) => void;
}

export function useUndoRedo<T>(options: UseUndoRedoOptions<T>) {
  const { initialState, maxHistory = 50, debounceMs = 300, onStateChange } = options;
  
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<UndoRedoState<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastStateRef = useRef<T>(initialState);

  // Check if undo/redo is available
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Add state to history
  const addToHistory = useCallback((newState: T, type: string = 'update', description?: string) => {
    if (isUndoRedoAction) {
      setIsUndoRedoAction(false);
      return;
    }

    const historyEntry: UndoRedoState<T> = {
      type,
      data: newState,
      timestamp: Date.now(),
      description,
    };

    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new entry
      newHistory.push(historyEntry);
      
      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory, isUndoRedoAction]);

  // Update state with debouncing
  const updateState = useCallback((newState: T, type: string = 'update', description?: string) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Only add to history if state actually changed
      if (JSON.stringify(newState) !== JSON.stringify(lastStateRef.current)) {
        addToHistory(newState, type, description);
        lastStateRef.current = newState;
      }
      
      setState(newState);
      onStateChange?.(newState);
    }, debounceMs);
  }, [addToHistory, debounceMs, onStateChange]);

  // Undo action
  const undo = useCallback(() => {
    if (!canUndo) return;
    
    setIsUndoRedoAction(true);
    const newIndex = currentIndex - 1;
    const previousState = history[newIndex];
    
    setCurrentIndex(newIndex);
    setState(previousState.data);
    lastStateRef.current = previousState.data;
    onStateChange?.(previousState.data);
  }, [canUndo, currentIndex, history, onStateChange]);

  // Redo action
  const redo = useCallback(() => {
    if (!canRedo) return;
    
    setIsUndoRedoAction(true);
    const newIndex = currentIndex + 1;
    const nextState = history[newIndex];
    
    setCurrentIndex(newIndex);
    setState(nextState.data);
    lastStateRef.current = nextState.data;
    onStateChange?.(nextState.data);
  }, [canRedo, currentIndex, history, onStateChange]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    setIsUndoRedoAction(false);
  }, []);

  // Get current history entry
  const getCurrentHistoryEntry = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return null;
  }, [currentIndex, history]);

  // Get history summary
  const getHistorySummary = useCallback(() => {
    return {
      total: history.length,
      current: currentIndex + 1,
      canUndo,
      canRedo,
      currentEntry: getCurrentHistoryEntry(),
    };
  }, [history.length, currentIndex, canUndo, canRedo, getCurrentHistoryEntry]);

  // Initialize history with initial state
  useEffect(() => {
    if (history.length === 0) {
      addToHistory(initialState, 'init', 'Initial state');
    }
  }, [initialState, addToHistory, history.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    history,
    currentIndex,
    
    // Actions
    updateState,
    undo,
    redo,
    clearHistory,
    
    // Computed
    canUndo,
    canRedo,
    getCurrentHistoryEntry,
    getHistorySummary,
  };
}

// Specialized hooks for common use cases
export function usePropertyUndoRedo(initialProperty: any) {
  return useUndoRedo({
    initialState: initialProperty,
    maxHistory: 30,
    debounceMs: 500,
  });
}

export function useFormUndoRedo<T>(initialFormData: T) {
  return useUndoRedo({
    initialState: initialFormData,
    maxHistory: 20,
    debounceMs: 300,
  });
}
