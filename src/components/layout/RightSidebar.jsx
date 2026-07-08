import { useMemo } from 'react'
import { Layers, ShieldCheck, Sparkles, Clock, CheckCircle2, XCircle } from 'lucide-react'
import useAppStore from '../../store/useAppStore'
import { validateACFJson } from '../../services/acfValidator'
import InspectorPanel from './panels/InspectorPanel'
import HistoryPanel from './panels/HistoryPanel'
import AiSuggestionsPanel from './panels/AiSuggestionsPanel'

const TABS = [
  { id: 'inspector',   label: 'Inspector',  icon: Layers },
  { id: 'validation',  label: 'Validation', icon: ShieldCheck },
  { id: 'suggestions', label: 'AI',         icon: Sparkles },
  { id: 'history',     label: 'History',    icon: Clock },
]

export default function RightSidebar() {
  const { rightPanel, setRightPanel, currentJson, setCurrentPage } = useAppStore()

  const validation = useMemo(() => {
    if (!currentJson) return null
    return validateACFJson(currentJson)
  }, [currentJson])

  return (
    <aside className="w-72 flex flex-col bg-surface border-l border-edge shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-edge shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = rightPanel === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setRightPanel(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                active
                  ? 'text-accent-light border-b-2 border-accent'
                  : 'text-dim hover:text-muted'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {rightPanel === 'inspector' && <InspectorPanel />}
        {rightPanel === 'validation' && (
          validation ? (
            <CompactValidation
              validation={validation}
              onOpenFull={() => setCurrentPage('validation')}
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No Validation"
              message="Run validation on loaded JSON to see results."
            />
          )
        )}
        {rightPanel === 'suggestions' && <AiSuggestionsPanel />}
        {rightPanel === 'history' && <HistoryPanel />}
      </div>
    </aside>
  )
}

function CompactValidation({ validation, onOpenFull }) {
  const { valid, score, errors, warnings } = validation
  const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error'

  return (
    <div className="space-y-3">
      <div className="bg-elevated rounded-xl border border-edge p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {valid
              ? <CheckCircle2 size={14} className="text-success" />
              : <XCircle      size={14} className="text-error"   />}
            <span className="text-xs font-semibold text-ink">
              {valid ? 'Looks good' : 'Issues found'}
            </span>
          </div>
          <span className={`text-2xl font-bold font-mono tabular-nums ${scoreColor}`}>
            {score}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span><span className="text-error font-mono">{errors.length}</span> errors</span>
          <span><span className="text-warning font-mono">{warnings.length}</span> warnings</span>
        </div>
      </div>

      <button
        onClick={onOpenFull}
        className="w-full text-xs text-center py-2 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
      >
        Open full validation report →
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-40 text-center py-8">
      <Icon size={22} className="text-dim mb-3" />
      <div className="text-sm font-medium text-muted mb-1">{title}</div>
      <div className="text-xs text-dim leading-relaxed">{message}</div>
    </div>
  )
}