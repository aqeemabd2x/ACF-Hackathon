import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Copy, Check, FileJson, FileCode2, Minimize2,
  Palette, Eye, Monitor, Tablet, Smartphone, Info,
} from 'lucide-react'
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

const BASE_MODES = [
  { id: 'pretty',   label: 'Pretty JSON',  icon: FileJson },
  { id: 'minified', label: 'Minified JSON', icon: Minimize2 },
  { id: 'php',      label: 'PHP Snippet',  icon: FileCode2 },
]

// Only offered when the loaded JSON is still exactly what a design-image
// generation produced (see `hasDesign` below).
const DESIGN_MODES = [
  { id: 'css',     label: 'CSS',     icon: Palette },
  { id: 'preview', label: 'Preview', icon: Eye },
]

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor,    width: '100%' },
  { id: 'tablet',  label: 'Tablet',  icon: Tablet,     width: '768px' },
  { id: 'mobile',  label: 'Mobile',  icon: Smartphone, width: '375px' },
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
  const currentJson         = useAppStore((s) => s.currentJson)
  const currentDesignResult = useAppStore((s) => s.currentDesignResult)

  const [mode, setMode]         = useState('pretty')
  const [copied, setCopied]     = useState(false)
  const [viewport, setViewport] = useState('desktop')

  // True only while the loaded JSON is exactly what the last design-image
  // generation produced — i.e. the AI's PHP/CSS/preview still describe it.
  // Any edit to the JSON (or loading something else) breaks the match, and
  // the CSS/Preview tabs disappear along with the AI PHP (falling back to
  // the locally-generated PHP snippet below).
  const hasDesign = useMemo(
    () => !!(currentDesignResult && currentJson && currentDesignResult.acf === currentJson),
    [currentDesignResult, currentJson]
  )

  const MODES = useMemo(
    () => (hasDesign ? [...BASE_MODES, ...DESIGN_MODES] : BASE_MODES),
    [hasDesign]
  )

  // Bounce back to a JSON tab if the design-only tab we were on stops applying.
  useEffect(() => {
    if (!hasDesign && (mode === 'css' || mode === 'preview')) setMode('pretty')
  }, [hasDesign, mode])

  const prettyJson = useMemo(() => {
    if (!currentJson) return ''
    try { return JSON.stringify(JSON.parse(currentJson), null, 2) } catch { return currentJson }
  }, [currentJson])

  const minifiedJson = useMemo(() => {
    if (!currentJson) return ''
    try { return JSON.stringify(JSON.parse(currentJson)) } catch { return currentJson }
  }, [currentJson])

  const phpCode = useMemo(() => {
    // Prefer the AI-authored PHP from the design generation — it matches
    // the actual markup/classes it also generated for CSS/preview.
    if (hasDesign && currentDesignResult?.php) return currentDesignResult.php
    if (!currentJson) return ''
    try { return generatePHP(currentJson) } catch (err) { return `// ${err.message}` }
  }, [currentJson, hasDesign, currentDesignResult])

  const cssCode = useMemo(
    () => (hasDesign ? (currentDesignResult?.css || '') : ''),
    [hasDesign, currentDesignResult]
  )

  const previewHtml = useMemo(
    () => (hasDesign ? (currentDesignResult?.previewHtml || '') : ''),
    [hasDesign, currentDesignResult]
  )

  const usageSnippet = useMemo(() => {
    if (!currentJson) return ''
    try { return generateUsageSnippet(currentJson) } catch { return '' }
  }, [currentJson])

  const filename = useMemo(() => deriveFilename(currentJson || ''), [currentJson])

  const activeContent =
    mode === 'pretty'   ? prettyJson   :
    mode === 'minified' ? minifiedJson :
    mode === 'php'      ? phpCode      :
    mode === 'css'      ? cssCode      : ''

  const activeLanguage =
    mode === 'php' ? 'php' :
    mode === 'css' ? 'css' : 'json'

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
    } else if (mode === 'php') {
      saveAs(new Blob([phpCode], { type: 'application/x-httpd-php' }), `${filename}.php`)
      toast.success(`Downloaded ${filename}.php`)
    } else if (mode === 'css') {
      saveAs(new Blob([cssCode], { type: 'text/css' }), `${filename}.css`)
      toast.success(`Downloaded ${filename}.css`)
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
              {hasDesign
                ? 'Download your ACF JSON, PHP, CSS, or preview the generated design'
                : 'Download your ACF JSON in pretty or minified format, or export as PHP'}
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
          {/* AI assumptions note — only meaningful for a design-image generation */}
          {hasDesign && currentDesignResult?.assumptions?.length > 0 && (
            <div className="shrink-0 flex items-start gap-2 px-4 py-2.5 rounded-lg border border-info/20 bg-info/5">
              <Info size={13} className="text-info mt-0.5 shrink-0" />
              <div className="text-[11px] text-muted leading-relaxed">
                <span className="font-medium text-ink">AI assumptions: </span>
                {currentDesignResult.assumptions.join(' · ')}
              </div>
            </div>
          )}

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
                  {mode === 'pretty'   && `${filename}.json`}
                  {mode === 'minified' && `${filename}.min.json`}
                  {mode === 'php'      && `${filename}.php`}
                  {mode === 'css'      && `${filename}.css`}
                  {mode === 'preview'  && 'Live Preview'}
                </span>

                {mode === 'preview' ? (
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
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(activeContent, mode === 'php' ? 'PHP' : mode === 'css' ? 'CSS' : 'JSON')}
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
                )}
              </div>

              {/* Body: editor for JSON/PHP/CSS, iframe for Preview */}
              <div className="flex-1 min-h-0">
                {mode === 'preview' ? (
                  <div className="h-full w-full overflow-auto bg-base flex justify-center p-4">
                    <iframe
                      title="Design preview"
                      srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;}${cssCode || ''}</style></head><body>${previewHtml || '<p style="font-family:sans-serif;color:#999;padding:2rem;">No preview markup generated.</p>'}</body></html>`}
                      style={{ width: VIEWPORTS.find((v) => v.id === viewport).width, height: '100%' }}
                      className="bg-white rounded-lg border border-edge shadow-xl transition-all duration-200"
                      sandbox=""
                    />
                  </div>
                ) : (
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
                )}
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