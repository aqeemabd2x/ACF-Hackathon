import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Download, Check, Code2, Edit3, Minimize2, Maximize2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { toast } from 'react-hot-toast'
import { saveAs } from 'file-saver'
import { editACF } from '../../services/gemini'

// Custom Monaco theme to match the app's dark palette
const ACF_DARK_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string.key.json',   foreground: 'a78bfa' },
    { token: 'string.value.json', foreground: '86efac' },
    { token: 'number',            foreground: 'fb923c' },
    { token: 'keyword.json',      foreground: '67e8f9' },
  ],
  colors: {
    'editor.background':            '#131328',
    'editor.foreground':            '#dde3f0',
    'editorLineNumber.foreground':  '#44496a',
    'editorLineNumber.activeForeground': '#7d8a9e',
    'editor.selectionBackground':   '#2a2a4a',
    'editor.lineHighlightBackground': '#1d1d38',
    'editorCursor.foreground':      '#7c3aed',
    'editorIndentGuide.background': '#1d1d38',
    'scrollbar.shadow':             '#00000000',
    'scrollbarSlider.background':   '#2a2a4a88',
    'scrollbarSlider.hoverBackground': '#3a3a6088',
  },
}

function prettyPrint(json) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

function deriveFilename(json) {
  try {
    const parsed = JSON.parse(json)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    if (arr[0]?.title) {
      return arr[0].title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }
  } catch {}
  return 'acf-fields'
}

export default function GeneratedResult({ json, onEdit }) {
  const [localJson, setLocalJson]         = useState(() => prettyPrint(json))
  const [editPrompt, setEditPrompt]       = useState('')
  const [isEditBarOpen, setEditBarOpen]   = useState(false)
  const [isApplying, setIsApplying]       = useState(false)
  const [copied, setCopied]               = useState(false)
  const [isMinified, setIsMinified]       = useState(false)

  // Tracks the last value *this component* pushed out via onEdit, so we can
  // tell the difference between "user typed in the editor" (an echo of our
  // own change coming back down as a prop) and "a brand new JSON arrived
  // from outside" (new Generate, Import, Merge, undo/redo). Only the latter
  // should reset the editor — otherwise the cursor jumps while typing.
  const lastEmittedRef = useRef(json)

  useEffect(() => {
    if (json !== lastEmittedRef.current) {
      setLocalJson(prettyPrint(json))
      setIsMinified(false)
      lastEmittedRef.current = json
    }
  }, [json])

  const displayJson = isMinified
    ? (() => { try { return JSON.stringify(JSON.parse(localJson)) } catch { return localJson } })()
    : prettyPrint(localJson)

  const handleEditorMount = useCallback((editor, monaco) => {
    monaco.editor.defineTheme('acf-dark', ACF_DARK_THEME)
    monaco.editor.setTheme('acf-dark')
  }, [])

  const handleEditorChange = (value) => {
    const v = value ?? ''
    setLocalJson(v)
    lastEmittedRef.current = v
    onEdit(v)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(localJson).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const filename = deriveFilename(localJson)
    const blob = new Blob([prettyPrint(localJson)], { type: 'application/json' })
    saveAs(blob, `${filename}.json`)
    toast.success(`Downloaded ${filename}.json`)
  }

  const handleAiEdit = async () => {
    if (!editPrompt.trim()) return
    setIsApplying(true)
    try {
      const newJson = await editACF(editPrompt, localJson)
      const pretty  = prettyPrint(newJson)
      setLocalJson(pretty)
      lastEmittedRef.current = pretty
      onEdit(pretty)
      setEditPrompt('')
      setEditBarOpen(false)
      toast.success('Changes applied')
    } catch (err) {
      toast.error(err.message || 'Failed to apply edit')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="h-full flex flex-col rounded-xl border border-border bg-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-success" />
          <span className="text-sm font-medium text-ink">Generated JSON</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-medium">
            Valid ACF
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Minify toggle */}
          <button
            onClick={() => setIsMinified(!isMinified)}
            title={isMinified ? 'Pretty print' : 'Minify'}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-card border border-edge text-dim hover:text-muted hover:border-border transition-colors cursor-pointer"
          >
            {isMinified ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
          </button>

          {/* AI Edit */}
          <button
            onClick={() => setEditBarOpen(!isEditBarOpen)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isEditBarOpen
                ? 'bg-accent-dim border-accent/30 text-accent-light'
                : 'bg-card border-edge text-muted hover:text-ink hover:border-border'
            }`}
          >
            <Edit3 size={11} /> AI Edit
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
          >
            {copied
              ? <Check size={11} className="text-success" />
              : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white border border-accent/30 transition-colors cursor-pointer"
          >
            <Download size={11} /> Download
          </button>
        </div>
      </div>

      {/* AI Edit bar */}
      <AnimatePresence>
        {isEditBarOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex gap-2 px-4 py-3 border-b border-edge bg-accent-dim/20">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                placeholder="e.g. Add a gallery field, rename hero_title to banner_title, make price required…"
                autoFocus
                className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim focus:outline-none focus:border-accent transition-colors"
              />
              <motion.button
                onClick={handleAiEdit}
                disabled={!editPrompt.trim() || isApplying}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                {isApplying ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Edit3 size={13} />
                )}
                {isApplying ? 'Applying…' : 'Apply'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="json"
          value={displayJson}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="acf-dark"
          options={{
            minimap:              { enabled: false },
            fontSize:             12.5,
            lineHeight:           21,
            fontFamily:           "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures:        true,
            padding:              { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            wordWrap:             'on',
            renderLineHighlight:  'gutter',
            smoothScrolling:      true,
            cursorBlinking:       'smooth',
            folding:              true,
            lineNumbers:          'on',
            scrollbar: {
              verticalScrollbarSize:   6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  )
}