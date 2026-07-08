import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, History, ChevronRight, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
import { generateACF } from '../services/gemini'
import PromptInput from '../components/ai/PromptInput'
import GeneratedResult from '../components/ai/GeneratedResult'

export default function CreateACF() {
  const { addPromptHistory, setCurrentJson, currentJson, promptHistory, clearPromptHistory } = useAppStore()

  const [result, setResult]           = useState(() => currentJson)
  const [isGenerating, setGenerating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleGenerate = async (prompt) => {
    setGenerating(true)
    try {
      const json = await generateACF(prompt)
      setResult(json)
      setCurrentJson(json)
      addPromptHistory({ prompt, type: 'generate' })
      toast.success('ACF JSON generated')
    } catch (err) {
      toast.error(err.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleResultEdit = (newJson) => {
    setResult(newJson)
    setCurrentJson(newJson)
  }

  const handleRerun = (entry) => {
    setShowHistory(false)
    handleGenerate(entry.prompt)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-edge shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent-dim flex items-center justify-center">
            <Sparkles size={14} className="text-accent-light" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink leading-none">AI ACF Generator</h1>
            <p className="text-[10px] text-dim mt-0.5">
              Describe your fields — Gemini generates valid ACF JSON
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            showHistory
              ? 'bg-accent-dim border-accent/30 text-accent-light'
              : 'bg-elevated border-edge text-muted hover:text-ink hover:border-border'
          }`}
        >
          <History size={13} />
          History
          {promptHistory.length > 0 && (
            <span className="bg-accent/30 text-accent-light text-[9px] px-1.5 py-0.5 rounded-full">
              {promptHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4 min-w-0">
          <PromptInput onGenerate={handleGenerate} isLoading={isGenerating} />

          <AnimatePresence mode="wait">
            {isGenerating && !result && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <div className="text-sm text-muted">Generating ACF JSON with Gemini…</div>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 min-h-0"
              >
                <GeneratedResult json={result} onEdit={handleResultEdit} />
              </motion.div>
            )}

            {!result && !isGenerating && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-elevated border border-edge flex items-center justify-center mx-auto">
                    <Sparkles size={24} className="text-dim" />
                  </div>
                  <div className="text-sm font-medium text-muted">No JSON generated yet</div>
                  <div className="text-xs text-dim">
                    Enter a prompt above and click Generate, or pick an example.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="border-l border-edge bg-surface overflow-hidden shrink-0 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Prompt History
                </span>
                {promptHistory.length > 0 && (
                  <button
                    onClick={() => {
                      clearPromptHistory()
                      toast.success('History cleared')
                    }}
                    className="text-dim hover:text-error transition-colors cursor-pointer"
                    title="Clear history"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {promptHistory.length === 0 ? (
                  <div className="text-xs text-dim text-center py-10">
                    No history yet. Generate something!
                  </div>
                ) : (
                  promptHistory.map((entry) => (
                    <HistoryEntry
                      key={entry.id}
                      entry={entry}
                      onRerun={handleRerun}
                      onLoad={() => {
                        // Re-use last result from store if available (placeholder)
                        toast('Loaded prompt into editor', { icon: '📋' })
                      }}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function HistoryEntry({ entry, onRerun }) {
  return (
    <div className="group rounded-lg border border-edge bg-elevated p-3 hover:border-border transition-colors">
      <div className="text-xs text-muted leading-relaxed line-clamp-3 mb-2">
        {entry.prompt}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-dim">
          {new Date(entry.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <button
          onClick={() => onRerun(entry)}
          className="flex items-center gap-1 text-[10px] text-accent-light hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <RotateCcw size={10} /> Re-run
        </button>
      </div>
    </div>
  )
}