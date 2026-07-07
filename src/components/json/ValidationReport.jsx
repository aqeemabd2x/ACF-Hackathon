import { CheckCircle2, XCircle, AlertTriangle, Lightbulb } from 'lucide-react'

export default function ValidationReport({ validation }) {
  const { valid, score, errors, warnings, suggestions, stats } = validation

  const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error'
  const barColor   = score >= 80 ? 'bg-success'   : score >= 50 ? 'bg-warning'   : 'bg-error'

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="bg-elevated rounded-xl border border-edge p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {valid
              ? <CheckCircle2 size={16} className="text-success" />
              : <XCircle     size={16} className="text-error"   />}
            <span className="text-sm font-semibold text-ink">
              {valid ? 'Valid ACF JSON' : 'Invalid ACF JSON'}
            </span>
          </div>
          <span className={`text-3xl font-bold font-mono tabular-nums ${scoreColor}`}>
            {score}
          </span>
        </div>

        {/* Bar */}
        <div className="h-1.5 bg-card rounded-full overflow-hidden mb-4">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <StatCell label="Groups"   value={stats.groups}   />
          <StatCell label="Fields"   value={stats.fields}   />
          <StatCell label="Errors"   value={errors.length}   color={errors.length   > 0 ? 'text-error'   : undefined} />
          <StatCell label="Warnings" value={warnings.length} color={warnings.length > 0 ? 'text-warning' : undefined} />
        </div>
      </div>

      {/* All-clear banner */}
      {valid && errors.length === 0 && warnings.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/20">
          <CheckCircle2 size={15} className="text-success shrink-0" />
          <span className="text-sm text-success">
            All checks passed. This JSON is ready to import into WordPress ACF.
          </span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <IssueList
          title="Errors"
          count={errors.length}
          items={errors}
          Icon={XCircle}
          accent="error"
        />
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <IssueList
          title="Warnings"
          count={warnings.length}
          items={warnings}
          Icon={AlertTriangle}
          accent="warning"
        />
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <IssueList
          title="Suggestions"
          count={suggestions.length}
          items={suggestions}
          Icon={Lightbulb}
          accent="info"
        />
      )}
    </div>
  )
}

function IssueList({ title, count, items, Icon, accent }) {
  const colors = {
    error:   { icon: 'text-error',   border: 'border-error/20',   bg: 'bg-error/5',   dot: 'bg-error',   divider: 'divide-error/10'   },
    warning: { icon: 'text-warning', border: 'border-warning/20', bg: 'bg-warning/5', dot: 'bg-warning', divider: 'divide-warning/10' },
    info:    { icon: 'text-info',    border: 'border-info/20',    bg: 'bg-info/5',    dot: 'bg-info',    divider: 'divide-info/10'    },
  }
  const c = colors[accent]

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${c.border}`}>
        <Icon size={13} className={c.icon} />
        <span className="text-xs font-semibold text-ink">{title}</span>
        <span className={`ml-auto text-xs font-mono font-bold ${c.icon}`}>{count}</span>
      </div>

      {/* Items */}
      <div className={`divide-y ${c.divider}`}>
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-[5px] shrink-0`} />
            <div className="min-w-0 space-y-0.5">
              {item.field && (
                <div className="text-[10px] font-mono text-dim">{item.field}</div>
              )}
              <div className="text-xs text-muted leading-relaxed">{item.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCell({ label, value, color }) {
  return (
    <div className="text-center bg-card rounded-lg py-2.5 border border-edge">
      <div className={`text-lg font-bold tabular-nums ${color || 'text-ink'}`}>{value}</div>
      <div className="text-[10px] text-dim mt-0.5">{label}</div>
    </div>
  )
}
