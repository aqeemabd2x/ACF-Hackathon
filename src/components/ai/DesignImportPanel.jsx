import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import ImageDropZone from './ImageDropZone'

/**
 * Upload panel for the "Design Image → Code" workflow: image dropzone +
 * optional notes + generate button. Mirrors the layout/behavior of
 * PromptInput so both entry points feel consistent.
 */
export default function DesignImportPanel({ onGenerate, isLoading }) {
  const [image, setImage] = useState(null) // { url, name, mimeType, base64 }
  const [notes, setNotes] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!image || isLoading) return
    onGenerate({ base64Data: image.base64, mimeType: image.mimeType, notes: notes.trim() })
  }

  return (
    <div className="shrink-0 space-y-3">
      <div className="rounded-xl border border-border bg-elevated overflow-hidden">
        <div className="p-4">
          <ImageDropZone onImageChange={setImage} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-4 pb-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="Optional: add context the image doesn't show (e.g. brand colors, exact copy, number of cards)…"
              rows={2}
              className="w-full bg-card border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim resize-none focus:outline-none focus:border-accent disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <div className="flex items-center gap-3">
              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="flex items-center gap-1 text-xs text-dim hover:text-muted transition-colors cursor-pointer"
                >
                  <X size={11} /> Clear notes
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-dim hidden sm:block">
                {isLoading ? 'Analyzing design…' : image ? 'Ready to generate' : 'Upload an image first'}
              </span>

              <motion.button
                type="submit"
                disabled={!image || isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate from Image
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
