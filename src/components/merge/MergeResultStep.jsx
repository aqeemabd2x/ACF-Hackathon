import { useCallback, useState } from 'react'
import { ArrowLeft, Copy, Download, Check, CheckCircle2, Upload } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { toast } from 'react-hot-toast'
import { saveAs } from 'file-saver'
import useAppStore from '../../store/useAppStore'

const DARK_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string.key.json',   foreground: 'a78bfa' },
    { token: 'string.value.json', foreground: '86efac' },
    { token: 'number',            foreground: 'fb923c' },
  ],
  colors: {
    'editor.background':                '#131328',
    'editor.foreground':                '#dde3f0',
    'editorLineNumber.foreground':      '#44496a',
    'editor.selectionBackground':       '#2a2a4a',
    'editor.lineHighlightBackground':   '#1d1d38',
    'editorCursor.foreground':          '#7c3aed',
    'scrollbarSlider.background':       '#2a2a4a88',
    'scrollbarSlider.hoverBackground':  '#3a3a6088',
  },
}

export default function MergeResultStep({ mergedJson, onLoad, onBack }) {
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { setCurrentPage } = useAppStore()

  const onMount = useCallback((editor, monaco) => {
    monaco.editor.defineTheme('acf-dark', DARK_THEME)
    monaco.editor.setTheme('acf-dark')
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(mergedJson)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([mergedJson], { type: 'application/json' })
    saveAs(blob, 'acf-merged.json')
    toast.success('Downloaded acf-merged.json')
  }

  const handleLoad = () => {
    onLoad()
    setLoaded(true)
  }

  // Compute quick stats
  let stats = { groups: 0, fields: 0 }
  try {
    const parsed = JSON.parse(mergedJson)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    stats.groups = arr.length
    stats.fields = arr.reduce((s, g) => s + (g.fields?.length || 0), 0)
  } catch {}

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-edge shrink-0">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={15} className="text-success" />
          <span className="text-sm font-semibold text-ink">Merge Complete</span>
          <div className="flex items-center gap-2 ml-2">
            <Badge label={`${stats.groups} group${stats.groups !== 1 ? 's' : ''}`} />
            <Badge label={`${stats.fields} fields`} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
          >
            {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
          >
            <Download size={11} /> Download
          </button>

          {loaded ? (
            <button
              onClick={() => setCurrentPage('create-acf')}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-success/15 border border-success/30 text-success transition-colors cursor-pointer"
            >
              <CheckCircle2 size={11} /> Loaded — Open Editor
            </button>
          ) : (
            <button
              onClick={handleLoad}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer"
            >
              <Upload size={11} /> Load into Workspace
            </button>
          )}
        </div>
      </div>

      {/* Monaco */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="json"
          value={mergedJson}
          onMount={onMount}
          theme="acf-dark"
          options={{
            readOnly:             false,
            minimap:              { enabled: false },
            fontSize:             12.5,
            lineHeight:           21,
            fontFamily:           "'JetBrains Mono', Consolas, monospace",
            fontLigatures:        true,
            padding:              { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            wordWrap:             'on',
            folding:              true,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center px-6 py-3 border-t border-edge shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Diff
        </button>
      </div>
    </div>
  )
}

function Badge({ label }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded bg-elevated border border-edge text-dim font-mono">
      {label}
    </span>
  )
}
