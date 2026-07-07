import { Layers, ShieldCheck, Sparkles, Clock } from 'lucide-react'
import useAppStore from '../../store/useAppStore'
import InspectorPanel from './panels/InspectorPanel'

const TABS = [
  { id: 'inspector',   label: 'Inspector',  icon: Layers },
  { id: 'validation',  label: 'Validation', icon: ShieldCheck },
  { id: 'suggestions', label: 'AI',         icon: Sparkles },
  { id: 'history',     label: 'History',    icon: Clock },
]

export default function RightSidebar() {
  const { rightPanel, setRightPanel } = useAppStore()

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
          <EmptyState
            icon={ShieldCheck}
            title="No Validation"
            message="Run validation on loaded JSON to see results."
          />
        )}
        {rightPanel === 'suggestions' && (
          <EmptyState
            icon={Sparkles}
            title="No Suggestions"
            message="Generate or load JSON to receive AI suggestions."
          />
        )}
        {rightPanel === 'history' && (
          <EmptyState
            icon={Clock}
            title="No History"
            message="Undo/redo history will appear as you work."
          />
        )}
      </div>
    </aside>
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
