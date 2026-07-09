import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Copy, Check, FileJson, FileCode2, Minimize2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { saveAs } from 'file-saver'
import Editor from '@monaco-editor/react'
import useAppStore from '../store/useAppStore'
import { generatePHP, generateUsageSnippet } from '../services/phpGenerator'

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

const MODES = [
  { id: 'pretty',   label: 'Pretty JSON',  icon: FileJson },
  { id: 'minified', label: 'Minified JSON', icon: Minimize2 },
  { id: 'php',      label: 'PHP Snippet',  icon: FileCode2 },
]

function deriveFilename(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    if (arr[0]?.title) {
      return arr[0].title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }
  } catch {}
  return 'acf-fields'
}

export default function ExportJSON() {
  const currentJson = useAppStore((s) => s.currentJson)
  const [mode, setMode]     = useState('pretty')
  const [copied, setCopied] = useState(false)

  const prettyJson = useMemo(() => {
    if (!currentJson) return ''
    try { return JSON.stringify(JSON.parse(currentJson), null, 2) } catch { return currentJson }
  }, [currentJson])

  const minifiedJson = useMemo(() => {
    if (!currentJson) return ''
    try { return JSON.stringify(JSON.parse(currentJson)) } catch { return currentJson }
  }, [currentJson])

  const phpCode = useMemo(() => {
    if (!currentJson) return ''
    try { return generatePHP(currentJson) } catch (err) { return `// ${err.message}` }
  }, [currentJson])

  const usageSnippet = useMemo(() => {
    if (!currentJson) return ''
    try { return generateUsageSnippet(currentJson) } catch { return '' }
  }, [currentJson])

  const filename = useMemo(() => deriveFilename(currentJson || ''), [currentJson])

  const activeContent = mode === 'pretty' ? prettyJson : mode === 'minified' ? minifiedJson : phpCode
  const activeLanguage = mode === 'php' ? 'php' : 'json'

  const handleEditorMount = useCallback((editor, monaco) => {
    monaco.editor.defineTheme('acf-dark', ACF_DARK_THEME)
    monaco.editor.setTheme('acf-dark')
  }, [])

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    if (mode === 'pretty') {
      saveAs(new Blob([prettyJson], { type: 'application/json' }), `${filename}.json`)
      toast.success(`Downloaded ${filename}.json`)
    } else if (mode === 'minified') {
      saveAs(new Blob([minifiedJson], { type: 'application/json' }), `${filename}.min.json`)
      toast.success(`Downloaded ${filename}.min.json`)
    } else {
      saveAs(new Blob([phpCode], { type: 'application/x-httpd-php' }), `${filename}.php`)
      toast.success(`Downloaded ${filename}.php`)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-edge shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent-dim flex items-center justify-center">
            <Download size={14} className="text-accent-light" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink leading-none">Export JSON</h1>
            <p className="text-[10px] text-dim mt-0.5">
              Download your ACF JSON in pretty or minified format, or export as PHP
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
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  active ? 'bg-accent-dim text-accent-light' : 'text-dim hover:text-muted'
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
      {!currentJson ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-elevated border border-edge flex items-center justify-center">
            <Download size={24} className="text-dim" />
          </div>
          <div className="text-sm font-medium text-muted">No JSON loaded</div>
          <div className="text-xs text-dim max-w-xs leading-relaxed">
            Generate, import, or merge ACF JSON first — it'll show up here to export.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col p-5 gap-4 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col rounded-xl border border-border bg-elevated overflow-hidden min-h-0"
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
                <span className="text-xs font-medium text-ink">
                  {mode === 'pretty' && `${filename}.json`}
                  {mode === 'minified' && `${filename}.min.json`}
                  {mode === 'php' && `${filename}.php`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(activeContent, mode === 'php' ? 'PHP' : 'JSON')}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white border border-accent/30 transition-colors cursor-pointer"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={activeLanguage}
                  value={activeContent}
                  theme="acf-dark"
                  onMount={handleEditorMount}
                  options={{
                    readOnly:              true,
                    minimap:               { enabled: false },
                    fontSize:              12.5,
                    lineHeight:            21,
                    fontFamily:            "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures:         true,
                    padding:               { top: 16, bottom: 16 },
                    scrollBeyondLastLine:  false,
                    wordWrap:              'on',
                    renderLineHighlight:   'none',
                    folding:               true,
                    lineNumbers:           'on',
                    scrollbar: {
                      verticalScrollbarSize:   6,
                      horizontalScrollbarSize: 6,
                    },
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Usage snippet — only relevant for PHP export */}
          {mode === 'php' && usageSnippet && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="shrink-0 rounded-xl border border-border bg-elevated overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
                <div>
                  <div className="text-xs font-medium text-ink">Usage Example</div>
                  <div className="text-[10px] text-dim mt-0.5">
                    Drop this into your template file (e.g. single.php) to read the field values
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(usageSnippet, 'Usage snippet')}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer shrink-0"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre className="p-4 text-[11px] leading-relaxed text-muted font-mono overflow-x-auto max-h-52 overflow-y-auto">
                {usageSnippet}
              </pre>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}