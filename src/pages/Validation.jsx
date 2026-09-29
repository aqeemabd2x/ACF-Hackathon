import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Sparkles, RotateCcw, Wrench, X, AlertTriangle, Lightbulb,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
// Structural Check tab is hidden for now — kept here in case it's re-enabled later.
// import { validateACFJson } from '../services/acfValidator'
import { validateACF as validateACFWithAI, applyValidationFixes } from '../services/gemini'
import ValidationReport from '../components/json/ValidationReport'

const MODES = [
  // { id: 'structural', label: 'Structural Check', icon: Zap,       hint: 'Instant, rule-based, runs locally' },
  { id: 'ai',          label: 'AI Deep Scan',     icon: Sparkles,  hint: 'Gemini checks relationships, performance & compatibility' },
]

export default function Validation() {
  const currentJson = useAppStore((s) => s.currentJson)
  const setCurrentJson = useAppStore((s) => s.setCurrentJson)
  const aiValidationCache = useAppStore((s) => s.aiValidation)
  const setAIValidation   = useAppStore((s) => s.setAIValidation)

  const [mode, setMode]           = useState('ai')
  const [isScanning, setScanning] = useState(false)
  const [aiError, setAiError]     = useState(null)

  const [isFixing, setFixing]                 = useState(false)
  const [fixError, setFixError]               = useState(null)
  const [showSuggestionPrompt, setShowSuggestionPrompt] = useState(false)

  // Reuse a scan already run elsewhere (e.g. Import JSON) for this exact
  // JSON instead of forcing the user to re-scan from scratch — derived
  // straight from the store cache rather than mirrored into local state.
  const aiResult = useMemo(() => {
    if (aiValidationCache && aiValidationCache.json === currentJson) return aiValidationCache.result
    return null
  }, [currentJson, aiValidationCache])

  // Structural Check tab is hidden — stop feeding it data on load. Kept
  // commented (not deleted) so it can be switched back on later.
  // const structuralResult = useMemo(() => {
  //   if (!currentJson) return null
  //   return validateACFJson(currentJson)
  // }, [currentJson])

  // AI results are normalized into the same shape ValidationReport expects,
  // since Gemini only returns { score, errors, warnings, suggestions }.
  const aiValidation = useMemo(() => {
    if (!aiResult) return null
    const errors   = aiResult.errors   || []
    const warnings = aiResult.warnings || []
    return {
      valid:       errors.length === 0,
      score:       typeof aiResult.score === 'number' ? aiResult.score : 0,
      errors,
      warnings,
      suggestions: aiResult.suggestions || [],
      stats:       { groups: 0, fields: 0 },
    }
  }, [aiResult])

  const requiredIssues  = aiValidation ? [...aiValidation.errors, ...aiValidation.warnings] : []
  const suggestions     = aiValidation?.suggestions || []
  const hasAnythingToFix = requiredIssues.length > 0 || suggestions.length > 0

  const handleScan = async () => {
    if (!currentJson) return
    setScanning(true)
    setAiError(null)
    try {
      const result = await validateACFWithAI(currentJson)
      setAIValidation(currentJson, result)
      toast.success('AI scan complete')
    } catch (err) {
      setAiError(err.message || 'AI validation failed')
      toast.error(err.message || 'AI validation failed')
    } finally {
      setScanning(false)
    }
  }

  // Runs the actual fix — called either directly (nothing to ask about) or
  // after the user picks an option in the suggestions dialog.
  const runFixAll = async (includeSuggestions) => {
    if (!currentJson) return
    setShowSuggestionPrompt(false)
    setFixing(true)
    setFixError(null)
    try {
      const issues = [...requiredIssues, ...(includeSuggestions ? suggestions : [])]
      const fixedJson = await applyValidationFixes(currentJson, issues)
      setCurrentJson(fixedJson)
      toast.success(
        includeSuggestions
          ? 'Applied fixes and suggestions — re-scan to verify'
          : 'Applied fixes — re-scan to verify'
      )
    } catch (err) {
      setFixError(err.message || 'Could not apply fixes')
      toast.error(err.message || 'Could not apply fixes')
    } finally {
      setFixing(false)
    }
  }

  // "Fix All" only ever needs to ask the user one thing: whether the
  // optional suggestions should be folded in too. If there's nothing
  // optional to ask about, just go straight to fixing.
  const handleFixAllClick = () => {
    if (!hasAnythingToFix) return
    if (suggestions.length > 0) {
      setShowSuggestionPrompt(true)
    } else {
      runFixAll(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-edge shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent-dim flex items-center justify-center">
            <ShieldCheck size={14} className="text-accent-light" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink leading-none">AI Validation</h1>
            <p className="text-[10px] text-dim mt-0.5">
              Scan the loaded ACF JSON for structural errors, broken references, and performance issues
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-1 bg-elevated border border-edge rounded-lg p-1">
          {MODES.map((m) => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.hint}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-accent-dim text-accent-light'
                    : 'text-dim hover:text-muted'
                }`}
              >
                <Icon size={12} />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {!currentJson ? (
          <EmptyState />
        ) : (
          <div className="max-w-5xl mx-auto space-y-4">
            <AnimatePresence mode="wait">
              {/* Structural Check tab hidden — block kept for when it's re-enabled.
              {mode === 'structural' && (
                <motion.div
                  key="structural"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ValidationReport validation={structuralResult} />
                </motion.div>
              )}
              */}

              {mode === 'ai' && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Scan trigger */}
                  <div className="flex items-center justify-between bg-elevated border border-edge rounded-xl px-5 py-4">
                    <div>
                      <div className="text-sm font-medium text-ink">Gemini Deep Scan</div>
                      <div className="text-xs text-dim mt-0.5">
                        Checks relationships, missing parents, performance concerns & compatibility issues
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {aiValidation && hasAnythingToFix && (
                        <motion.button
                          onClick={handleFixAllClick}
                          disabled={isFixing || isScanning}
                          whileTap={{ scale: 0.97 }}
                          title={`Fix ${requiredIssues.length} issue${requiredIssues.length !== 1 ? 's' : ''}${suggestions.length ? ` (+${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''} optional)` : ''}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 hover:bg-success/20 border border-success/30 text-success text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          {isFixing ? (
                            <div className="w-4 h-4 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                          ) : (
                            <Wrench size={13} />
                          )}
                          {isFixing ? 'Fixing…' : 'Fix All'}
                        </motion.button>
                      )}

                      <motion.button
                        onClick={handleScan}
                        disabled={isScanning || isFixing}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {isScanning ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : aiResult ? (
                          <RotateCcw size={13} />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        {isScanning ? 'Scanning…' : aiResult ? 'Re-scan' : 'Scan with AI'}
                      </motion.button>
                    </div>
                  </div>

                  {aiError && !isScanning && (
                    <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
                      {aiError}
                    </div>
                  )}

                  {fixError && !isFixing && (
                    <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
                      {fixError}
                    </div>
                  )}

                  {isScanning && !aiResult && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                      <div className="text-sm text-muted">Gemini is analyzing your ACF JSON…</div>
                    </div>
                  )}

                  {isFixing && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-8 h-8 border-2 border-success/20 border-t-success rounded-full animate-spin" />
                      <div className="text-sm text-muted">Gemini is applying fixes…</div>
                    </div>
                  )}

                  {aiValidation && !isScanning && !isFixing && (
                    <ValidationReport validation={aiValidation} json={currentJson} />
                  )}

                  {!aiResult && !isScanning && !isFixing && !aiError && (
                    <div className="text-center text-xs text-dim py-10">
                      Click "Scan with AI" to run a deep analysis with Gemini.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <SuggestionPromptDialog
        open={showSuggestionPrompt}
        requiredCount={requiredIssues.length}
        suggestionCount={suggestions.length}
        onCancel={() => setShowSuggestionPrompt(false)}
        onConfirm={(includeSuggestions) => runFixAll(includeSuggestions)}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-elevated border border-edge flex items-center justify-center">
        <ShieldCheck size={24} className="text-dim" />
      </div>
      <div className="text-sm font-medium text-muted">No JSON loaded</div>
      <div className="text-xs text-dim max-w-xs leading-relaxed">
        Generate, import, or merge ACF JSON first — it'll show up here for validation.
      </div>
    </div>
  )
}

// Asks, once, whether the optional suggestions should be folded into the
// fix along with the required errors/warnings. Only ever shown when there
// are suggestions to ask about — plain required-only fixes skip this and
// run immediately.
function SuggestionPromptDialog({ open, requiredCount, suggestionCount, onCancel, onConfirm }) {
  const hasRequired = requiredCount > 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-elevated shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-info" />
                <span className="text-sm font-semibold text-ink">
                  {hasRequired ? 'Include suggestions too?' : 'Apply suggestions?'}
                </span>
              </div>
              <button
                onClick={onCancel}
                className="text-dim hover:text-muted transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {hasRequired && (
                <div className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                  <AlertTriangle size={13} className="text-warning mt-0.5 shrink-0" />
                  <span>
                    {requiredCount} error{requiredCount !== 1 ? 's' : ''}/warning{requiredCount !== 1 ? 's' : ''} will
                    be fixed either way.
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                <Lightbulb size={13} className="text-info mt-0.5 shrink-0" />
                <span>
                  There {suggestionCount === 1 ? 'is' : 'are'} also {suggestionCount} optional suggestion
                  {suggestionCount !== 1 ? 's' : ''} — non-blocking improvements Gemini noticed. Add
                  {suggestionCount !== 1 ? ' them' : ' it'} into the JSON too?
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                onClick={() => onConfirm(true)}
                className="w-full py-2 rounded-lg bg-success/10 hover:bg-success/20 border border-success/30 text-success text-sm font-medium transition-colors cursor-pointer"
              >
                {hasRequired ? 'Fix everything (include suggestions)' : `Apply ${suggestionCount} suggestion${suggestionCount !== 1 ? 's' : ''}`}
              </button>
              {hasRequired && (
                <button
                  onClick={() => onConfirm(false)}
                  className="w-full py-2 rounded-lg bg-card hover:bg-elevated border border-edge text-muted hover:text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  Errors & warnings only
                </button>
              )}
              <button
                onClick={onCancel}
                className="w-full py-2 rounded-lg text-dim hover:text-muted text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}