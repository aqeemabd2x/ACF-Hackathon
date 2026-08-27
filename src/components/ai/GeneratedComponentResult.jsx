import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Download, Check, FileJson, FileCode2, Palette, Eye,
  Monitor, Tablet, Smartphone, Info, PackageCheck,
} from 'lucide-react'
import Editor from '@monaco-editor/react'
import { toast } from 'react-hot-toast'
import { saveAs } from 'file-saver'

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

const TABS = [
  { id: 'acf',     label: 'ACF JSON', icon: FileJson,  language: 'json', ext: 'json', filename: 'acf-fields' },
  { id: 'php',     label: 'PHP',      icon: FileCode2, language: 'php',  ext: 'php',  filename: 'template' },
  { id: 'css',     label: 'CSS',      icon: Palette,   language: 'css',  ext: 'css',  filename: 'style' },
  { id: 'preview', label: 'Preview',  icon: Eye,       language: null,   ext: null,   filename: null },
]

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor,    width: '100%' },
  { id: 'tablet',  label: 'Tablet',  icon: Tablet,     width: '768px' },
  { id: 'mobile',  label: 'Mobile',  icon: Smartphone, width: '375px' },
]

function prettyJson(json) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

/**
 * Tabbed viewer/editor for a design-to-code result: ACF JSON, PHP template,
 * CSS and a live preview — the three connected outputs plus a rendered
 * approximation of the final component.
 */
export default function GeneratedComponentResult({ data, onEdit }) {
  const [activeTab, setActiveTab]   = useState('acf')
  const [viewport, setViewport]     = useState('desktop')
  const [copiedTab, setCopiedTab]   = useState(null)

  const acfPretty = useMemo(() => prettyJson(data.acf), [data.acf])

  const handleEditorMount = useCallback((editor, monaco) => {
    monaco.editor.defineTheme('acf-dark', ACF_DARK_THEME)
    monaco.editor.setTheme('acf-dark')
  }, [])

  const currentTab = TABS.find((t) => t.id === activeTab)

  const currentValue = activeTab === 'acf' ? acfPretty : data[activeTab]

  const handleChange = (value) => {
    const v = value ?? ''
    onEdit({ ...data, [activeTab]: v })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentValue || '').then(() => {
      setCopiedTab(activeTab)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedTab(null), 2000)
    })
  }

  const downloadTab = (tab) => {
    const value = tab.id === 'acf' ? prettyJson(data.acf) : data[tab.id]
    const mime = tab.id === 'acf' ? 'application/json' : 'text/plain'
    const blob = new Blob([value || ''], { type: mime })
    saveAs(blob, `${tab.filename}.${tab.ext}`)
  }

  const handleDownload = () => {
    if (!currentTab || !currentTab.ext) return
    downloadTab(currentTab)
    toast.success(`Downloaded ${currentTab.filename}.${currentTab.ext}`)
  }

  const handleExportAll = () => {
    TABS.filter((t) => t.ext).forEach((tab, i) => {
      setTimeout(() => downloadTab(tab), i * 250)
    })
    toast.success('Downloading acf-fields.json, template.php and style.css')
  }

  return (
    <div className="h-full flex flex-col rounded-xl border border-border bg-elevated overflow-hidden">
      {/* Header / tabs */}
      <div className="flex items-center justify-between px-2 border-b border-edge shrink-0">
        <div className="flex items-center">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'text-accent-light border-accent'
                    : 'text-dim border-transparent hover:text-muted'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 py-2 pr-2">
          {activeTab !== 'preview' && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
              >
                {copiedTab === activeTab
                  ? <Check size={11} className="text-success" />
                  : <Copy size={11} />}
                {copiedTab === activeTab ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-card border border-edge text-muted hover:text-ink hover:border-border transition-colors cursor-pointer"
              >
                <Download size={11} /> Download
              </button>
            </>
          )}
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 rounded-lg border border-edge bg-card p-0.5">
              {VIEWPORTS.map((vp) => {
                const Icon = vp.icon
                const active = viewport === vp.id
                return (
                  <button
                    key={vp.id}
                    onClick={() => setViewport(vp.id)}
                    title={vp.label}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      active ? 'bg-accent-dim text-accent-light' : 'text-dim hover:text-muted'
                    }`}
                  >
                    <Icon size={11} />
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white border border-accent/30 transition-colors cursor-pointer"
          >
            <PackageCheck size={11} /> Export All
          </button>
        </div>
      </div>

      {/* Assumptions note */}
      {data.assumptions?.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-2 border-b border-edge bg-info/5 shrink-0">
          <Info size={13} className="text-info mt-0.5 shrink-0" />
          <div className="text-[11px] text-muted leading-relaxed">
            <span className="font-medium text-ink">AI assumptions: </span>
            {data.assumptions.join(' · ')}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'preview' ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full overflow-auto bg-base flex justify-center p-4"
            >
              <iframe
                title="Design preview"
                srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;}${data.css || ''}</style></head><body>${data.previewHtml || '<p style="font-family:sans-serif;color:#999;padding:2rem;">No preview markup generated.</p>'}</body></html>`}
                style={{ width: VIEWPORTS.find((v) => v.id === viewport).width, height: '100%' }}
                className="bg-white rounded-lg border border-edge shadow-xl transition-all duration-200"
                sandbox=""
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Editor
                height="100%"
                language={currentTab.language}
                value={currentValue || ''}
                onChange={handleChange}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
