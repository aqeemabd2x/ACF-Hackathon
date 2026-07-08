import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Sparkles, Zap, RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
import { validateACFJson } from '../services/acfValidator'
import { validateACF as validateACFWithAI } from '../services/gemini'
import ValidationReport from '../components/json/ValidationReport'

const MODES = [
  { id: 'structural', label: 'Structural Check', icon: Zap,       hint: 'Instant, rule-based, runs locally' },
  { id: 'ai',          label: 'AI Deep Scan',     icon: Sparkles,  hint: 'Gemini checks relationships, performance & compatibility' },
]

export default function Validation() {
  const currentJson = useAppStore((s) => s.currentJson)

  const [mode, setMode]           = useState('structural')
  const [aiResult, setAiResult]   = useState(null)
  const [isScanning, setScanning] = useState(false)
  const [aiError, setAiError]     = useState(null)

  // Instant local validation — recomputed whenever the loaded JSON changes.
  const structuralResult = useMemo(() => {
    if (!currentJson) return null
    return validateACFJson(currentJson)
  }, [currentJson])

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
      stats:       structuralResult?.stats || { groups: 0, fields: 0 },
    }
  }, [aiResult, structuralResult])

  const handleScan = async () => {
    if (!currentJson) return
    setScanning(true)
    setAiError(null)
    try {
      const result = await validateACFWithAI(currentJson)
      setAiResult(result)
      toast.success('AI scan complete')
    } catch (err) {
      setAiError(err.message || 'AI validation failed')
      toast.error(err.message || 'AI validation failed')
    } finally {
      setScanning(false)
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
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence mode="wait">
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
                    <motion.button
                      onClick={handleScan}
                      disabled={isScanning}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
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

                  {aiError && !isScanning && (
                    <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
                      {aiError}
                    </div>
                  )}

                  {isScanning && !aiResult && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                      <div className="text-sm text-muted">Gemini is analyzing your ACF JSON…</div>
                    </div>
                  )}

                  {aiValidation && !isScanning && (
                    <ValidationReport validation={aiValidation} />
                  )}

                  {!aiResult && !isScanning && !aiError && (
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