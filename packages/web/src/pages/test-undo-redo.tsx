import React, { useState } from 'react';
import { useUndoRedo } from '../lib/undo-redo-context';
import { useKeyboardShortcuts } from '../lib/use-keyboard-shortcuts';

export default function TestUndoRedo() {
  const [value, setValue] = useState(0);
  const { setState, state, canUndo, canRedo, undo, redo } = useUndoRedo();
  useKeyboardShortcuts();

  const increment = () => {
    const newValue = value + 1;
    setValue(newValue);
    setState({ type: 'test', value: newValue, timestamp: Date.now() });
  };

  const decrement = () => {
    const newValue = value - 1;
    setValue(newValue);
    setState({ type: 'test', value: newValue, timestamp: Date.now() });
  };

  const handleUndo = () => {
    console.log('Test undo clicked, canUndo:', canUndo);
    undo();
  };

  const handleRedo = () => {
    console.log('Test redo clicked, canRedo:', canRedo);
    redo();
  };

  // Effect to restore value from undo/redo
  React.useEffect(() => {
    if (state && state.type === 'test') {
      console.log('Restoring value from undo/redo:', state.value);
      setValue(state.value);
    }
  }, [state]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Undo/Redo Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Current Value: {value}</p>
        <p>Can Undo: {canUndo ? 'Yes' : 'No'}</p>
        <p>Can Redo: {canRedo ? 'Yes' : 'No'}</p>
        <p>Current State: {JSON.stringify(state)}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={increment} style={{ marginRight: '10px', padding: '10px' }}>
          Increment (+)
        </button>
        <button onClick={decrement} style={{ marginRight: '10px', padding: '10px' }}>
          Decrement (-)
        </button>
      </div>

      <div>
        <button 
          onClick={handleUndo} 
          disabled={!canUndo}
          style={{ 
            marginRight: '10px', 
            padding: '10px',
            background: canUndo ? '#f8f9fa' : '#e9ecef',
            cursor: canUndo ? 'pointer' : 'not-allowed'
          }}
        >
          Undo (Ctrl+Z)
        </button>
        <button 
          onClick={handleRedo} 
          disabled={!canRedo}
          style={{ 
            padding: '10px',
            background: canRedo ? '#f8f9fa' : '#e9ecef',
            cursor: canRedo ? 'pointer' : 'not-allowed'
          }}
        >
          Redo (Ctrl+Y)
        </button>
      </div>
    </div>
  );
}
