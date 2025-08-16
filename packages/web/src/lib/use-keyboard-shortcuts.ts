import { useEffect } from 'react';
import { useUndoRedo } from './undo-redo-context';

export function useKeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      // Only handle shortcuts if not in an input field (to avoid interfering with text editing)
      if (isInput) return;

      // Ctrl+Z for undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'Z')) {
        event.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo]);
}
