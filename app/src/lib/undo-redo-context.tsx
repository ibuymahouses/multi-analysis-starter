import React, { createContext, useContext, useReducer, useCallback } from 'react';

interface UndoRedoState {
  past: any[];
  present: any;
  future: any[];
}

type UndoRedoAction = 
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_STATE'; payload: any }
  | { type: 'CLEAR' };

const initialState: UndoRedoState = {
  past: [],
  present: null,
  future: []
};

function undoRedoReducer(state: UndoRedoState, action: UndoRedoAction): UndoRedoState {
  const { past, present, future } = state;

  switch (action.type) {
    case 'UNDO': {
      if (past.length === 0) return state;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [present, ...future]
      };
    }

    case 'REDO': {
      if (future.length === 0) return state;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture
      };
    }

    case 'SET_STATE': {
      if (present === action.payload) return state;

      return {
        past: [...past, present],
        present: action.payload,
        future: []
      };
    }

    case 'CLEAR': {
      return initialState;
    }

    default:
      return state;
  }
}

interface UndoRedoContextType {
  state: any;
  canUndo: boolean;
  canRedo: boolean;
  setState: (newState: any) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export function UndoRedoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(undoRedoReducer, initialState);

  const setState = useCallback((newState: any) => {
    dispatch({ type: 'SET_STATE', payload: newState });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const value: UndoRedoContextType = {
    state: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    setState,
    undo,
    redo,
    clear
  };

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext);
  if (context === undefined) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider');
  }
  return context;
}
