import { useState } from 'react'
import { Sparkles, Plus, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../../../store/useAppStore'
import { generateFieldSuggestions } from '../../../services/gemini'

function generateFieldKey() {
  return 'field_' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function generateGroupKey() {
  return 'group_' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function AiSuggestionsPanel() {
  const currentJson = useAppStore((s) => s.currentJson)
  const setCurrentJson = useAppStore((s) => s.setCurrentJson)

  const [prompt, setPrompt]         = useState('')
  const [suggestions, setSugg]      = useState(null)
  const [isLoading, setLoading]     = useState(false)
  const [error, setError]           = useState(null)
  const [addedNames, setAddedNames] = useState(new Set())

  const handleGetSuggestions = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await generateFieldSuggestions(prompt)
      setSugg(Array.isArray(result) ? result : [])
      setAddedNames(new Set())
    } catch (err) {
      setError(err.message || 'Failed to get suggestions')
      toast.error(err.message || 'Failed to get suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = (suggestion) => {
    let groups
    try {
      const parsed = currentJson ? JSON.parse(currentJson) : null
      groups = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
    } catch {
      groups = []
    }

    if (groups.length === 0) {
      groups = [{
        key: generateGroupKey(),
        title: 'AI Suggested Fields',
        fields: [],
        location: [[{ param: 'post_type', operator: '==', value: 'post' }]],
        menu_order: 0,
        position: 'normal',
        style: 'default',
        active: true,
      }]
    }

    const newField = {
      key: generateFieldKey(),
      label: suggestion.label || 'Untitled Field',
      name: suggestion.name || slugify(suggestion.label),
      type: suggestion.type || 'text',
      instructions: suggestion.reason || '',
      required: 0,
      conditional_logic: 0,
      wrapper: { width: '', class: '', id: '' },
    }

    groups[0] = { ...groups[0], fields: [...(groups[0].fields || []), newField] }
    setCurrentJson(JSON.stringify(groups, null, 2))
    setAddedNames((prev) => new Set(prev).add(suggestion.name || suggestion.label))
    toast.success(`Added "${newField.label}" to JSON`)
  }

  return (
    <div className="space-y-4">
      {/* Prompt input */}
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGetSuggestions()
          }}
          placeholder="e.g. fields for a real estate listing"
          rows={3}
          className="w-full bg-elevated border border-edge rounded-lg px-3 py-2 text-xs text-ink placeholder:text-dim focus:outline-none focus:border-accent transition-colors resize-none"
        />
        <button
          onClick={handleGetSuggestions}
          disabled={!prompt.trim() || isLoading}
          className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {isLoading ? 'Thinking…' : 'Get Suggestions'}
        </button>
      </div>

      {error && !isLoading && (
        <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Suggestions list */}
      {suggestions && !isLoading && (
        suggestions.length === 0 ? (
          <div className="text-xs text-dim text-center py-6">No suggestions returned. Try rephrasing.</div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const already = addedNames.has(s.name || s.label)
              return (
                <div key={i} className="rounded-lg border border-edge bg-elevated p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink truncate">{s.label}</div>
                      <div className="text-[10px] font-mono text-dim truncate">
                        {s.name} · {s.type}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddField(s)}
                      disabled={already}
                      title={already ? 'Already added' : 'Add to JSON'}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-accent-dim text-accent-light hover:bg-accent hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  {s.reason && (
                    <div className="text-[10px] text-muted leading-relaxed">{s.reason}</div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {!suggestions && !isLoading && !error && (
        <div className="text-xs text-dim text-center py-6 leading-relaxed">
          Describe what you're building and Gemini will suggest relevant ACF fields.
        </div>
      )}
    </div>
  )
}