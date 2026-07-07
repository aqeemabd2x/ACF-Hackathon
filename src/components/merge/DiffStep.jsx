import { motion } from 'framer-motion'
import { ArrowLeft, GitMerge, CheckSquare, Square, Sparkles, Zap, Plus, RefreshCw, Equal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { mergeSuggestion } from '../../services/gemini'

const STATUS_CFG = {
  new:       { label: 'New',        color: 'text-success', bg: 'bg-success/10 border-success/20', Icon: Plus      },
  update:    { label: 'Will update',color: 'text-warning', bg: 'bg-warning/10 border-warning/20', Icon: RefreshCw },
  identical: { label: 'Identical',  color: 'text-dim',     bg: 'bg-card border-edge',              Icon: Equal     },
  conflict:  { label: 'Conflict',   color: 'text-info',    bg: 'bg-info/10 border-info/20',        Icon: Zap       },
}

export default function DiffStep({
  analysis, fileA, fileB,
  selectedKeys, setSelectedKeys,
  resolutions, setResolutions,
  onMerge, onBack,
}) {
  const [aiResult,  setAiResult]  = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const setRes = (key, value) =>
    setResolutions(prev => ({ ...prev, [key]: value }))

  const toggleField = (key, disabled) => {
    if (disabled) return
    setSelectedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleGroup = (ga) => {
    const selectable = ga.fields.filter(f => f.status !== 'identical').map(f => f.field.key)
    const allOn      = selectable.every(k => selectedKeys.has(k))
    setSelectedKeys(prev => {
      const next = new Set(prev)
      selectable.forEach(k => allOn ? next.delete(k) : next.add(k))
      return next
    })
  }

  const handleAI = async () => {
    setLoadingAI(true)
    try {
      const r = await mergeSuggestion(fileA.json, fileB.json)
      setAiResult(r)
    } catch (err) {
      toast.error(err.message || 'AI analysis failed')
    } finally {
      setLoadingAI(false)
    }
  }

  const totalSelectable = analysis.reduce((s, g) =>
    s + g.fields.filter(f => f.status !== 'identical').length, 0)
  const selectedCount   = selectedKeys.size

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-edge shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Select fields from File A</span>
          <span className="text-xs text-dim">to transfer into File B</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-2">
            {Object.entries(STATUS_CFG).map(([k, s]) => (
              <div key={k} className="flex items-center gap-1 text-[10px] text-dim">
                <div className={`w-2 h-2 rounded-sm border ${s.bg}`} />
                {s.label}
              </div>
            ))}
          </div>

          <span className={`text-xs px-2.5 py-1 rounded-lg border tabular-nums ${
            selectedCount > 0
              ? 'bg-accent-dim border-accent/30 text-accent-light'
              : 'bg-elevated border-edge text-dim'
          }`}>
            {selectedCount} / {totalSelectable} selected
          </span>

          <button
            onClick={handleAI}
            disabled={loadingAI}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-accent/30 bg-accent-dim/50 text-accent-light hover:bg-accent-dim transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingAI
              ? <div className="w-3 h-3 border border-accent-light/30 border-t-accent-light rounded-full animate-spin" />
              : <Sparkles size={11} />}
            AI Suggest
          </button>
        </div>
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* AI suggestions */}
        {aiResult && (
          <div className="rounded-xl border border-accent/20 bg-accent-dim/20 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-light">
              <Sparkles size={12} /> AI Merge Suggestions
            </div>
            {(aiResult.suggestions || []).map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted">
                <span className="text-accent-light mt-0.5 shrink-0">•</span>
                <span>{typeof s === 'string' ? s : (s.message || '')}</span>
              </div>
            ))}
          </div>
        )}

        {analysis.length === 0 && (
          <div className="text-sm text-muted text-center py-12">
            File A has no field groups.
          </div>
        )}

        {analysis.map((ga, gi) => {
          const selectable         = ga.fields.filter(f => f.status !== 'identical')
          const selectedInGroup    = selectable.filter(f => selectedKeys.has(f.field.key)).length
          const allSelectedInGroup = selectable.length > 0 && selectedInGroup === selectable.length

          return (
            <div key={gi} className="rounded-xl border border-edge bg-elevated overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-card border-b border-edge cursor-pointer hover:bg-elevated transition-colors"
                onClick={() => toggleGroup(ga)}
              >
                <span className="shrink-0 text-dim">
                  {allSelectedInGroup
                    ? <CheckSquare size={15} className="text-accent-light" />
                    : selectedInGroup > 0
                      ? <CheckSquare size={15} className="text-dim/60" />
                      : <Square size={15} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-ink truncate">
                    {ga.group.title || ga.group.key}
                  </div>
                  <div className="text-[10px] text-dim font-mono truncate">{ga.group.key}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    ga.existsInB
                      ? 'bg-warning/10 border-warning/20 text-warning'
                      : 'bg-success/10 border-success/20 text-success'
                  }`}>
                    {ga.existsInB ? 'Overlapping' : 'New group'}
                  </span>
                  <span className="text-[10px] text-dim">
                    {selectedInGroup}/{selectable.length} selected
                  </span>
                </div>
              </div>

              {/* Field rows */}
              <div className="divide-y divide-edge">
                {ga.fields.map((fa, fi) => {
                  const { field, status, conflictWith } = fa
                  const cfg        = STATUS_CFG[status]
                  const Icon       = cfg.Icon
                  const isIdentical = status === 'identical'
                  const isSelected  = selectedKeys.has(field.key)

                  return (
                    <div key={fi} className={isSelected && !isIdentical ? 'bg-accent/5' : ''}>
                      {/* Row */}
                      <div
                        onClick={() => toggleField(field.key, isIdentical)}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isIdentical
                            ? 'opacity-35 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-surface'
                        }`}
                      >
                        <span className="shrink-0">
                          {isIdentical
                            ? <Square size={13} className="text-dim opacity-30" />
                            : isSelected
                              ? <CheckSquare size={13} className="text-accent-light" />
                              : <Square size={13} className="text-dim" />}
                        </span>

                        <span className={`shrink-0 p-1 rounded border ${cfg.bg}`}>
                          <Icon size={10} className={cfg.color} />
                        </span>

                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-ink">{field.label || field.name || field.key}</span>
                          {field.label && field.name && field.name !== field.label && (
                            <span className="text-[10px] text-dim ml-2 font-mono">{field.name}</span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-dim shrink-0">{field.type}</span>
                        <span className={`text-[10px] shrink-0 ${cfg.color}`}>{cfg.label}</span>
                      </div>

                      {/* Inline conflict resolver (only when selected) */}
                      {status === 'conflict' && isSelected && conflictWith && (
                        <div className="pl-[52px] pr-4 pb-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <FieldCard title="From A (incoming)" accent="text-info" field={field} />
                            <FieldCard title="In B (existing)"   accent="text-muted" field={conflictWith} />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-dim">Resolution:</span>
                            {[
                              { val: 'useSource', label: 'Replace B with A' },
                              { val: 'keepBase',  label: 'Keep B' },
                              { val: 'keepBoth',  label: 'Keep both (copy)' },
                            ].map(opt => (
                              <button
                                key={opt.val}
                                onClick={(e) => { e.stopPropagation(); setRes(field.key, opt.val) }}
                                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                                  (resolutions[field.key] ?? 'useSource') === opt.val
                                    ? 'bg-accent-dim border-accent/30 text-accent-light'
                                    : 'bg-card border-edge text-dim hover:border-border hover:text-muted'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-edge shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <motion.button
          onClick={onMerge}
          disabled={selectedCount === 0}
          whileHover={selectedCount > 0 ? { scale: 1.02 } : {}}
          whileTap={selectedCount > 0 ? { scale: 0.97 } : {}}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selectedCount > 0
              ? 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
              : 'bg-elevated text-dim border border-edge cursor-not-allowed'
          }`}
        >
          <GitMerge size={15} />
          {selectedCount > 0
            ? `Transfer ${selectedCount} field${selectedCount !== 1 ? 's' : ''} into B`
            : 'Select fields to continue'}
        </motion.button>
      </div>
    </div>
  )
}

function FieldCard({ title, accent, field }) {
  return (
    <div className="bg-card rounded-lg p-2.5 border border-edge space-y-0.5 text-[10px]">
      <div className={`font-semibold ${accent} mb-1`}>{title}</div>
      <div className="font-mono text-dim truncate">{field.key}</div>
      <div className="text-muted capitalize">{field.type}</div>
      {field.label && <div className="text-muted truncate">{field.label}</div>}
    </div>
  )
}
