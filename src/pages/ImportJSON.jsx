import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
import DropZone from '../components/json/DropZone'
import ValidationReport from '../components/json/ValidationReport'
import { validateACF as validateACFWithAI } from '../services/gemini'

const TABS = [
  { id: 'upload', label: '📂  Upload File' },
  { id: 'paste',  label: '📋  Paste JSON'  },
]

const PASTE_DEBOUNCE_MS = 700

// Count groups/fields purely for the stats card — no type/rule checking here,
// that part is delegated entirely to the AI scan below.
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
  for (const g of groups) walk(g.fields || [])
  return { groups: groups.length, fields }
}

// Gemini only returns { score, errors, warnings, suggestions } — normalize
// into the shape ValidationReport expects (same pattern as Validation.jsx).
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
  const [activeTab,   setActiveTab]   = useState('upload')
  const [rawJson,     setRawJson]     = useState('')
  const [pasteValue,  setPasteValue]  = useState('')
  const [validation,  setValidation]  = useState(null)
  const [isValidating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [loaded,      setLoaded]      = useState(false)

  const { setCurrentJson, setCurrentPage, setAIValidation } = useAppStore()
  const debounceRef = useRef(null)

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const runAIValidation = useCallback(async (json) => {
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch (e) {
      setValidation({
        valid: false,
        score: 0,
        errors: [{ field: null, message: `Invalid JSON syntax: ${e.message}` }],
        warnings: [],
        suggestions: [],
        stats: { groups: 0, fields: 0 },
      })
      setValidationError(null)
      return
    }

    const stats = countStats(parsed)
    setValidating(true)
    setValidationError(null)
    try {
      const aiResult = await validateACFWithAI(json)
      setValidation(normalizeAIResult(aiResult, stats))
      // Cache the raw AI result so the Validation page shows this same scan
      // once this JSON is loaded into the workspace, instead of re-scanning.
      setAIValidation(json, aiResult)
    } catch (err) {
      setValidation(null)
      setValidationError(err.message || 'AI validation failed')
    } finally {
      setValidating(false)
    }
  }, [setAIValidation])

  const handleJson = useCallback((json) => {
    setRawJson(json)
    setLoaded(false)
    runAIValidation(json)
  }, [runAIValidation])

  const handlePasteChange = (e) => {
    const val = e.target.value
    setPasteValue(val)
    setRawJson(val)
    setLoaded(false)
    clearTimeout(debounceRef.current)

    if (!val.trim()) {
      setValidation(null)
      setValidationError(null)
      setValidating(false)
      return
    }

    debounceRef.current = setTimeout(() => runAIValidation(val), PASTE_DEBOUNCE_MS)
  }

  const handleLoad = () => {
    setCurrentJson(rawJson)
    setLoaded(true)
    toast.success('JSON loaded into workspace')
  }

  const handleGoToEditor = () => {
    setCurrentJson(rawJson)
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
            <h1 className="text-sm font-semibold text-ink leading-none">Import ACF JSON</h1>
            <p className="text-[10px] text-dim mt-0.5">
              Upload or paste ACF JSON to validate and load it into the workspace
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* ── Left panel ─────────────────────────────────────────── */}
        <div className="w-[400px] shrink-0 border-r border-edge flex flex-col p-5 gap-4 overflow-y-auto">
          {/* Tabs */}
          <div className="flex bg-elevated rounded-lg p-1 gap-1 border border-edge shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-dim hover:text-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <AnimatePresence mode="wait">
            {activeTab === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                <DropZone onJson={handleJson} />
              </motion.div>
            ) : (
              <motion.div
                key="paste"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col"
              >
                <textarea
                  value={pasteValue}
                  onChange={handlePasteChange}
                  placeholder={'Paste your ACF JSON here…\n\n[\n  {\n    "key": "group_abc123",\n    "title": "My Fields",\n    "fields": […]\n  }\n]'}
                  rows={14}
                  spellCheck={false}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-xs text-ink placeholder:text-dim font-mono resize-none focus:outline-none focus:border-accent transition-colors leading-relaxed"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          {isValidating && !validation && (
            <div className="flex items-center gap-2 w-full py-2.5 rounded-lg bg-elevated border border-edge px-4 shrink-0">
              <div className="w-3.5 h-3.5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
              <span className="text-xs text-muted">Validating with AI…</span>
            </div>
          )}

          {validationError && !isValidating && (
            <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3 shrink-0">
              {validationError}
            </div>
          )}

          {validation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 shrink-0"
            >
              {loaded ? (
                <div className="flex items-center gap-2 w-full py-2.5 rounded-lg bg-success/10 border border-success/20 px-4">
                  <CheckCircle2 size={14} className="text-success" />
                  <span className="text-sm text-success font-medium">Loaded into workspace</span>
                </div>
              ) : (
                <button
                  onClick={handleLoad}
                  disabled={!validation.valid || isValidating}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    validation.valid && !isValidating
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'bg-elevated text-dim border border-edge cursor-not-allowed'
                  }`}
                >
                  {validation.valid
                    ? 'Load into Workspace'
                    : `Fix ${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''} to continue`}
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
            </motion.div>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {validation ? (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {isValidating && (
                  <div className="absolute top-0 right-0 flex items-center gap-1.5 text-[10px] text-dim">
                    <div className="w-3 h-3 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                    Re-scanning…
                  </div>
                )}
                <ValidationReport validation={validation} />
              </motion.div>
            ) : isValidating ? (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full min-h-64 text-center gap-3"
              >
                <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                <div className="text-sm text-muted">Gemini is analyzing your ACF JSON…</div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full min-h-64 text-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-elevated border border-edge flex items-center justify-center">
                  <Upload size={28} className="text-dim" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-muted">Validation results will appear here</div>
                  <div className="text-xs text-dim">
                    Upload a file or paste JSON on the left to get started.
                  </div>
                </div>
                <div className="text-xs text-dim border border-edge rounded-lg px-4 py-2 max-w-xs leading-relaxed flex items-center gap-2">
                  <Sparkles size={12} className="text-accent-light shrink-0" />
                  Validated by Gemini — checks structure, field types, relationships & compatibility.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}