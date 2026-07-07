import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Wand2, ChevronDown, X } from 'lucide-react'

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

export default function PromptInput({ onGenerate, isLoading }) {
  const [prompt, setPrompt] = useState('')
  const [showExamples, setShowExamples] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return
    onGenerate(prompt.trim())
  }

  const handleExample = (examplePrompt) => {
    setPrompt(examplePrompt)
    setShowExamples(false)
  }

  return (
    <div className="shrink-0">
      <div className="rounded-xl border border-border bg-elevated overflow-hidden">
        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder={`Describe the ACF fields you need...\n\nExample: Create a Product field group with Product Name, Price (number), Image, Gallery, a Featured boolean, and a Specifications repeater with Label and Value fields.`}
            rows={7}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(e)
            }}
            className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-ink placeholder:text-dim resize-none focus:outline-none disabled:opacity-50 font-sans leading-relaxed"
          />

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
                {isLoading ? 'Generating...' : 'Ctrl + Enter'}
              </span>

              <motion.button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isLoading ? (
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
            className="mt-2 rounded-xl border border-border bg-elevated p-2 grid grid-cols-3 gap-2"
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
  )
}
