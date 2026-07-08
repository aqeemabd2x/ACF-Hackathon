import { Undo2, Redo2, Clock, FileJson } from 'lucide-react'
import useAppStore from '../../../store/useAppStore'

function summarize(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    const groups = Array.isArray(parsed) ? parsed : [parsed]
    const title = groups[0]?.title || 'Untitled'
    const count = groups.length
    return count > 1 ? `${title} +${count - 1} more` : title
  } catch {
    return 'Invalid JSON'
  }
}

export default function HistoryPanel() {
  const { history, historyIndex, undo, redo, canUndo, canRedo, goToHistoryIndex } = useAppStore()

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-40 text-center py-8">
        <Clock size={22} className="text-dim mb-3" />
        <div className="text-sm font-medium text-muted mb-1">No History</div>
        <div className="text-xs text-dim leading-relaxed">
          Undo/redo history will appear as you work.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Undo / Redo controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-elevated border border-edge text-muted hover:text-ink hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Undo2 size={12} /> Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-elevated border border-edge text-muted hover:text-ink hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Redo2 size={12} /> Redo
        </button>
      </div>

      <div className="text-[10px] text-dim text-center">
        {historyIndex + 1} / {history.length} versions · Ctrl/⌘+Z to undo
      </div>

      {/* Version list — newest first */}
      <div className="space-y-1.5">
        {[...history]
          .map((json, i) => ({ json, i }))
          .reverse()
          .map(({ json, i }) => {
            const isCurrent = i === historyIndex
            return (
              <button
                key={i}
                onClick={() => goToHistoryIndex(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-accent-dim border-accent/30'
                    : 'bg-elevated border-edge hover:border-border'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-accent/20' : 'bg-card'
                  }`}
                >
                  <FileJson size={11} className={isCurrent ? 'text-accent-light' : 'text-dim'} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium truncate ${isCurrent ? 'text-accent-light' : 'text-muted'}`}>
                    {summarize(json)}
                  </div>
                  <div className="text-[10px] text-dim">
                    Version {i + 1}{isCurrent ? ' · current' : ''}
                  </div>
                </div>
              </button>
            )
          })}
      </div>
    </div>
  )
}