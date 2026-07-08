import { useEffect } from 'react'
import useAppStore from '../store/useAppStore'

/**
 * Wires up Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z or Ctrl+Y (redo)
 * at the document level.
 *
 * Monaco Editor has its own internal undo/redo stack for text edits
 * (character-level). If we intercepted Ctrl+Z while focus is inside
 * the editor, we'd fight it — pressing undo would sometimes revert a
 * single keystroke in Monaco, sometimes jump the whole app-level JSON
 * back a version, unpredictably. So this hook skips entirely whenever
 * the active element is inside a `.monaco-editor` container, leaving
 * Monaco free to handle its own undo there.
 */
export default function useUndoRedoShortcuts() {
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)

  useEffect(() => {
    function handleKeyDown(e) {
      const isUndoKey = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z'
      const isRedoKey =
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')

      if (!isUndoKey && !isRedoKey) return

      const target = e.target
      if (target?.closest?.('.monaco-editor')) return

      // Also skip plain text inputs/textareas so users can still use
      // native undo while typing in the prompt box, search fields, etc.
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      e.preventDefault()
      if (isRedoKey) redo()
      else undo()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
}