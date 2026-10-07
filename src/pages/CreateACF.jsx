import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, History, RotateCcw, Trash2, Wand2, ChevronDown, X, ImageIcon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
import { generateACF, generateDesignToCode } from '../services/gemini'
import GeneratedResult from '../components/ai/GeneratedResult'
import ImageDropZone from '../components/ai/ImageDropZone'

const EXAMPLES = [
  {
    label: 'Product Fields',
    prompt: `Create a Product field group with:
- Product Name (text, required)
- Product Price (number)
- Product Image (image)
- Gallery (gallery)
- Featured Product (true/false)
- Specifications (repeater):
  - Label (text)
  - Value (text)
- CTA Button (group):
  - Text (text)
  - URL (url)`,
  },
  {
    label: 'SEO Fields',
    prompt: `Create an SEO field group with:
- Meta Title (text, max 60 chars)
- Meta Description (textarea, max 160 chars)
- OG Image (image)
- Canonical URL (url)
- No Index (true/false)
- Schema Type (select): Article, Product, Organization, Person`,
  },
  {
    label: 'Hero Section',
    prompt: `Create a Hero Section field group with:
- Headline (text, required)
- Subheadline (textarea)
- Background Image (image)
- Background Video (file)
- CTA Button (group):
  - Text (text)
  - URL (url)
  - Style (select): primary, secondary, outline
- Overlay Opacity (range, 0-100)`,
  },
  {
    label: 'Team Member',
    prompt: `Create a Team Member field group with:
- Full Name (text, required)
- Job Title (text)
- Bio (wysiwyg)
- Profile Photo (image)
- Social Links (repeater):
  - Platform (select): LinkedIn, Twitter, GitHub, Dribbble
  - URL (url)
- Skills (checkbox): Leadership, Development, Design, Marketing
- Featured (true/false)`,
  },
  {
    label: 'FAQ Section',
    prompt: `Create an FAQ field group with:
- Section Title (text)
- Introduction (textarea)
- FAQ Items (repeater):
  - Question (text, required)
  - Answer (wysiwyg)
  - Category (select): General, Technical, Billing, Support
  - Featured (true/false)`,
  },
  {
    label: 'Testimonial',
    prompt: `Create a Testimonials field group with:
- Quote (textarea, required)
- Author Name (text, required)
- Author Title (text)
- Author Photo (image)
- Company (text)
- Company Logo (image)
- Rating (select): 5, 4, 3, 2, 1
- Date (date_picker)`,
  },
]

export default function CreateACF() {
  const {
    addPromptHistory, setCurrentJson, currentJson, promptHistory, clearPromptHistory,
    setCurrentDesignResult,
  } = useAppStore()

  const [prompt, setPrompt]             = useState('')
  const [showExamples, setShowExamples] = useState(false)
  const [showImageInput, setShowImageInput] = useState(false)
  const [image, setImage]               = useState(null) // { url, name, mimeType, base64 }

  const [result, setResult]           = useState(() => currentJson)
  const [isGenerating, setGenerating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const canGenerate = (prompt.trim().length > 0 || !!image) && !isGenerating

  const handleGenerate = async (promptText, imageObj) => {
    const trimmedPrompt = (promptText ?? '').trim()
    if (!trimmedPrompt && !imageObj) return

    setGenerating(true)
    try {
      if (imageObj) {
        // Design-image flow: Gemini generates ACF + PHP + CSS + preview,
        // but this page only surfaces the ACF JSON. The full bundle is
        // stashed in the store so Export can offer PHP/CSS/Preview for it.
        const bundle = await generateDesignToCode({
          base64Data: imageObj.base64,
          mimeType: imageObj.mimeType,
          notes: trimmedPrompt,
        })
        const acfString = JSON.stringify(bundle.acf, null, 2)

        setResult(acfString)
        setCurrentJson(acfString)
        setCurrentDesignResult({ ...bundle, acf: acfString })
        addPromptHistory({
          prompt: trimmedPrompt,
          hasImage: true,
          imageName: imageObj.name,
          type: 'generate',
        })
        toast.success('ACF JSON generated from design')
      } else {
        // Prompt-only flow: plain ACF JSON, no design bundle to carry.
        const json = await generateACF(trimmedPrompt)

        setResult(json)
        setCurrentJson(json)
        setCurrentDesignResult(null)
        addPromptHistory({
          prompt: trimmedPrompt,
          hasImage: false,
          type: 'generate',
        })
        toast.success('ACF JSON generated')
      }
    } catch (err) {
      toast.error(err.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    if (!canGenerate) return
    handleGenerate(prompt, image)
  }

  const handleResultEdit = (newJson) => {
    setResult(newJson)
    setCurrentJson(newJson)
  }

  const handleExample = (examplePrompt) => {
    setPrompt(examplePrompt)
    setShowExamples(false)
  }

  const handleToggleImageInput = () => {
    setShowImageInput((v) => {
      const next = !v
      if (!next) setImage(null) // hiding the panel clears any attached image
      return next
    })
  }

  // Only text-only history entries can be re-run — the original image
  // bytes are never persisted to history (too large, and re-uploading is
  // the honest UX anyway).
  const handleRerun = (entry) => {
    if (entry.hasImage) return
    setShowHistory(false)
    setPrompt(entry.prompt)
    setImage(null)
    setShowImageInput(false)
    handleGenerate(entry.prompt, null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 sm:px-6 border-b border-edge shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent-dim flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-accent-light" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-ink leading-none">AI ACF Generator</h1>
            <p className="text-[10px] text-dim mt-0.5 hidden sm:block">
              Describe your fields — optionally attach a design screenshot — Gemini generates valid ACF JSON
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Design image toggle */}
          <button
            onClick={handleToggleImageInput}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              showImageInput
                ? 'bg-accent-dim border-accent/30 text-accent-light'
                : 'bg-elevated border-edge text-muted hover:text-ink hover:border-border'
            }`}
          >
            <ImageIcon size={13} />
            Design Image
            {image && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent-light shrink-0" />
            )}
          </button>

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
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row min-h-0">
        {/* Main */}
        <div className="flex-1 flex flex-col lg:overflow-hidden p-5 gap-4 min-w-0">
          {/* Input card */}
          <div className="shrink-0">
            <div className="rounded-xl border border-border bg-elevated overflow-hidden">
              <form onSubmit={handleSubmit}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  placeholder={`Describe the ACF fields you need...\n\nExample: Create a Product field group with Product Name, Price (number), Image, Gallery, a Featured boolean, and a Specifications repeater with Label and Value fields.`}
                  rows={showImageInput ? 4 : 7}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(e)
                  }}
                  className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-ink placeholder:text-dim resize-none focus:outline-none disabled:opacity-50 font-sans leading-relaxed"
                />

                {/* Design image panel — shown/hidden by the toggle above */}
                <AnimatePresence>
                  {showImageInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-edge">
                        <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-2">
                          Design Image (optional)
                        </div>
                        <ImageDropZone onImageChange={setImage} />
                        <p className="text-[10px] text-dim mt-2 leading-relaxed">
                          Attach a screenshot to generate ACF fields that match its layout. The text
                          above is used as extra notes/requirements for the design.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowExamples(!showExamples)}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      <Wand2 size={12} />
                      Examples
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${showExamples ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {prompt.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPrompt('')}
                        className="flex items-center gap-1 text-xs text-dim hover:text-muted transition-colors cursor-pointer"
                      >
                        <X size={11} /> Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dim hidden sm:block">
                      {isGenerating ? 'Generating...' : 'Ctrl + Enter'}
                    </span>

                    <motion.button
                      type="submit"
                      disabled={!canGenerate}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Generate
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </form>
            </div>

            {/* Example grid */}
            <AnimatePresence>
              {showExamples && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ transformOrigin: 'top' }}
                  className="mt-2 rounded-xl border border-border bg-elevated p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                >
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => handleExample(ex.prompt)}
                      className="text-left p-3 rounded-lg bg-card hover:bg-elevated border border-edge hover:border-border transition-all cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-ink mb-1">{ex.label}</div>
                      <div className="text-[10px] text-dim leading-relaxed line-clamp-2">
                        {ex.prompt.substring(0, 90)}…
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Generated ACF JSON — the only output shown on this page */}
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
                  <div className="text-sm text-muted">
                    {image ? 'Analyzing design and generating ACF JSON…' : 'Generating ACF JSON with Gemini…'}
                  </div>
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
                    Enter a prompt above, optionally attach a design image, and click Generate.
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
              className="max-w-full border-t lg:border-t-0 lg:border-l border-edge bg-surface overflow-hidden shrink-0 flex flex-col"
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
                    <HistoryEntry key={entry.id} entry={entry} onRerun={handleRerun} />
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
      {entry.hasImage && (
        <div className="flex items-center gap-1 mb-2">
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent-light border border-accent/20">
            <ImageIcon size={9} />
            {entry.imageName || 'Design image'}
          </span>
        </div>
      )}

      <div className="text-xs text-muted leading-relaxed line-clamp-3 mb-2">
        {entry.prompt || '(no text prompt)'}
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
        {entry.hasImage ? (
          <span className="text-[10px] text-dim" title="Design-image generations can't be re-run — the image isn't stored in history">
            Not re-runnable
          </span>
        ) : (
          <button
            onClick={() => onRerun(entry)}
            className="flex items-center gap-1 text-[10px] text-accent-light hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <RotateCcw size={10} /> Re-run
          </button>
        )}
      </div>
    </div>
  )
}