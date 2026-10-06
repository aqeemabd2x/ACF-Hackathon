import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, ArrowRight, CheckCircle2, Sparkles, RotateCcw, Wrench, X,
  AlertTriangle, Lightbulb,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
import DropZone from '../components/json/DropZone'
import ValidationReport from '../components/json/ValidationReport'
import { validateACF as validateACFWithAI, applyValidationFixes } from '../services/gemini'

// Count groups/fields purely for the stats card — no type/rule checking here,
// that part is delegated entirely to the AI scan.
function countStats(raw) {
  const groups = Array.isArray(raw) ? raw : [raw]
  let fields = 0
  const walk = (arr) => {
    if (!Array.isArray(arr)) return
    for (const f of arr) {
      fields += 1
      if (Array.isArray(f.sub_fields)) walk(f.sub_fields)
      if (f.layouts) {
        const layouts = Array.isArray(f.layouts) ? f.layouts : Object.values(f.layouts)
        for (const l of layouts) walk(l.sub_fields || [])
      }
    }
  }
  for (const g of groups) walk(g?.fields || [])
  return { groups: groups.length, fields }
}

// Gemini only returns { score, errors, warnings, suggestions } — normalize
// into the shape ValidationReport expects.
function normalizeAIResult(aiResult, stats) {
  const errors   = aiResult.errors   || []
  const warnings = aiResult.warnings || []
  return {
    valid:       errors.length === 0,
    score:       typeof aiResult.score === 'number' ? aiResult.score : 0,
    errors,
    warnings,
    suggestions: aiResult.suggestions || [],
    stats,
  }
}

export default function ImportJSON() {
  const currentJson       = useAppStore((s) => s.currentJson)
  const setCurrentJson    = useAppStore((s) => s.setCurrentJson)
  const setCurrentPage    = useAppStore((s) => s.setCurrentPage)
  const aiValidationCache = useAppStore((s) => s.aiValidation)
  const setAIValidation   = useAppStore((s) => s.setAIValidation)

  // The JSON under review. Starts from whatever is already in the workspace
  // (so generated/merged JSON can be validated here too); uploading replaces it.
  // It's a draft until "Load into Workspace" is pressed.
  const [json, setJson] = useState(() => currentJson || '')

  const [isScanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [isFixing, setFixing]     = useState(false)
  const [fixError, setFixError]   = useState(null)
  const [showSuggestionPrompt, setShowSuggestionPrompt] = useState(false)

  // Explicit flag for "this draft has been pushed into the workspace" — never
  // inferred from `json === currentJson` alone, otherwise opening this page
  // when the workspace already happens to hold the same JSON (e.g. coming
  // from Create ACF) would falsely show "Loaded" before the user did anything.
  const [committed, setCommitted] = useState(false)

  const isBusy = isScanning || isFixing
  const loaded = committed && json === currentJson

  // Syntax check + stats, derived from the draft JSON.
  const { parsed, syntaxError } = useMemo(() => {
    if (!json.trim()) return { parsed: null, syntaxError: null }
    try {
      return { parsed: JSON.parse(json), syntaxError: null }
    } catch (e) {
      return { parsed: null, syntaxError: e.message }
    }
  }, [json])

  // Reuse a cached scan for this exact JSON (survives navigation).
  const aiResult = useMemo(() => {
    if (aiValidationCache && aiValidationCache.json === json) return aiValidationCache.result
    return null
  }, [json, aiValidationCache])

  const validation = useMemo(() => {
    if (syntaxError) {
      return {
        valid: false,
        score: 0,
        errors: [{ field: null, message: `Invalid JSON syntax: ${syntaxError}` }],
        warnings: [],
        suggestions: [],
        stats: { groups: 0, fields: 0 },
      }
    }
    if (parsed && aiResult) return normalizeAIResult(aiResult, countStats(parsed))
    return null
  }, [syntaxError, parsed, aiResult])

  const requiredIssues = validation && !syntaxError ? [...validation.errors, ...validation.warnings] : []
  const suggestions    = validation && !syntaxError ? validation.suggestions : []
  const canFix         = !!validation && !syntaxError && (requiredIssues.length > 0 || suggestions.length > 0)
  // Only loadable once a scan has actually finished (or hit a syntax error, which blocks it outright).
  const canLoad         = !!json && !syntaxError && !!validation && !isBusy

  const runScan = useCallback(async (jsonStr) => {
    try { JSON.parse(jsonStr) } catch { return } // syntax errors are reported without an AI call
    setScanning(true)
    setScanError(null)
    try {
      const result = await validateACFWithAI(jsonStr)
      setAIValidation(jsonStr, result)
    } catch (err) {
      setScanError(err.message || 'AI validation failed')
    } finally {
      setScanning(false)
    }
  }, [setAIValidation])

  const handleUpload = useCallback((text) => {
    setJson(text)
    setFixError(null)
    setCommitted(false)
    runScan(text)
  }, [runScan])

  const runFixAll = async (includeSuggestions) => {
    setShowSuggestionPrompt(false)
    setFixing(true)
    setFixError(null)
    try {
      const issues = [...requiredIssues, ...(includeSuggestions ? suggestions : [])]
      const fixed = await applyValidationFixes(json, issues)
      setJson(fixed)
      // The fixed JSON hasn't been loaded into the workspace yet — re-scan it,
      // which re-enables "Load into Workspace" for the user to press themselves.
      setCommitted(false)
      toast.success('Fixes applied — re-scanning to verify')
      await runScan(fixed)
    } catch (err) {
      setFixError(err.message || 'Could not apply fixes')
      toast.error(err.message || 'Could not apply fixes')
    } finally {
      setFixing(false)
    }
  }

  // Only ask about suggestions when there are some; otherwise fix straight away.
  const handleFixAllClick = () => {
    if (!canFix || isBusy) return
    if (suggestions.length > 0) setShowSuggestionPrompt(true)
    else runFixAll(false)
  }

  const handleLoad = () => {
    setCurrentJson(json)
    setCommitted(true)
    toast.success('JSON loaded into workspace')
  }

  const handleGoToEditor = () => {
    setCurrentJson(json)
    setCurrentPage('create-acf')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-14 px-6 border-b border-edge shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-info/15 flex items-center justify-center">
            <Upload size={14} className="text-info" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink leading-none">Import & Validate</h1>
            <p className="text-[10px] text-dim mt-0.5">
              Upload ACF JSON, deep scan it with Gemini, fix issues, then load it into the workspace
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* ── Left panel ─────────────────────────────────────────── */}
        <div className="w-[360px] shrink-0 border-r border-edge flex flex-col p-5 gap-4 overflow-y-auto">
          <DropZone onJson={handleUpload} />

          {json && !loaded && !validation && !isBusy && !scanError && (
            <p className="text-[11px] text-dim leading-relaxed">
              Using the JSON already in your workspace. Run a scan on the right, or upload a different file.
            </p>
          )}

          {json && (
            <div className="space-y-2 shrink-0">
              {loaded ? (
                <div className="flex items-center gap-2 w-full py-2.5 rounded-lg bg-success/10 border border-success/20 px-4">
                  <CheckCircle2 size={14} className="text-success" />
                  <span className="text-sm text-success font-medium">Loaded into workspace</span>
                </div>
              ) : (
                <button
                  onClick={handleLoad}
                  disabled={!canLoad}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    canLoad
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'bg-elevated text-dim border border-edge cursor-not-allowed'
                  }`}
                >
                  {syntaxError ? 'Fix JSON syntax to continue' : !validation ? 'Run a scan to continue' : 'Load into Workspace'}
                </button>
              )}

              {loaded && (
                <button
                  onClick={handleGoToEditor}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-muted hover:text-ink border border-edge hover:border-border transition-colors cursor-pointer"
                >
                  Open in AI Editor <ArrowRight size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          {!json ? (
            <EmptyState />
          ) : (
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Scan bar */}
              <div className="bg-elevated border border-edge rounded-xl px-5 py-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      {isBusy && (
                        <div className="w-3.5 h-3.5 border-2 border-accent/20 border-t-accent rounded-full animate-spin shrink-0" />
                      )}
                      {isFixing
                        ? 'Applying fixes…'
                        : isScanning
                          ? 'Deep scanning with Gemini…'
                          : 'Gemini Deep Scan'}
                    </div>
                    <div className="text-xs text-dim mt-0.5">
                      {isBusy
                        ? 'Checking relationships, missing parents, performance concerns & compatibility'
                        : 'Checks relationships, missing parents, performance concerns & compatibility issues'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canFix && (
                      <motion.button
                        onClick={handleFixAllClick}
                        disabled={isBusy}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 hover:bg-success/20 border border-success/30 text-success text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Wrench size={13} />
                        Fix All
                      </motion.button>
                    )}

                    <motion.button
                      onClick={() => runScan(json)}
                      disabled={isBusy || !!syntaxError}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {aiResult ? <RotateCcw size={13} /> : <Sparkles size={13} />}
                      {aiResult ? 'Re-scan' : 'Scan with AI'}
                    </motion.button>
                  </div>
                </div>

                {isBusy && (
                  <div className="h-1 rounded-full bg-accent/10 overflow-hidden">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-accent"
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </div>

              {(scanError || fixError) && !isBusy && (
                <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
                  {scanError || fixError}
                </div>
              )}

              {/* Report */}
              {validation ? (
                <div className={`transition-opacity ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                  <ValidationReport validation={validation} json={json} />
                </div>
              ) : isBusy ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <div className="text-sm text-muted">
                    {isFixing ? 'Gemini is applying fixes…' : 'Gemini is deep scanning your ACF JSON…'}
                  </div>
                </div>
              ) : !scanError ? (
                <div className="text-center text-xs text-dim py-10">
                  Click "Scan with AI" to run a deep analysis with Gemini.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <SuggestionPromptDialog
        open={showSuggestionPrompt}
        requiredCount={requiredIssues.length}
        suggestionCount={suggestions.length}
        onCancel={() => setShowSuggestionPrompt(false)}
        onConfirm={runFixAll}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-elevated border border-edge flex items-center justify-center">
        <Upload size={28} className="text-dim" />
      </div>
      <div className="space-y-1.5">
        <div className="text-sm font-medium text-muted">Validation results will appear here</div>
        <div className="text-xs text-dim">Upload an ACF JSON file on the left to get started.</div>
      </div>
      <div className="text-xs text-dim border border-edge rounded-lg px-4 py-2 max-w-xs leading-relaxed flex items-center gap-2">
        <Sparkles size={12} className="text-accent-light shrink-0" />
        Deep scanned by Gemini — checks structure, field types, relationships & compatibility.
      </div>
    </div>
  )
}

// Asks, once, whether optional suggestions should be folded into the fix.
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
              <button onClick={onCancel} className="text-dim hover:text-muted transition-colors cursor-pointer">
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
                {hasRequired
                  ? 'Fix everything (include suggestions)'
                  : `Apply ${suggestionCount} suggestion${suggestionCount !== 1 ? 's' : ''}`}
              </button>
              {hasRequired && (
                <button
                  onClick={() => onConfirm(false)}
                  className="w-full py-2 rounded-lg bg-card hover:bg-elevated border border-edge text-muted hover:text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  Errors & warnings only
                </button>
              )}
              <button onClick={onCancel} className="w-full py-2 rounded-lg text-dim hover:text-muted text-xs transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}