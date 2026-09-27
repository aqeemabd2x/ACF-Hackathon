import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { XCircle, AlertTriangle, Lightbulb, MapPin, Copy, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { annotateValidationLines, buildMonacoMarkers } from '../../services/validationMarkers'

// Matches the Monaco theme used across the rest of the app (GeneratedResult,
// ExportJSON, MergeResultStep) so the validation view doesn't look out of place.
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
    return json || ''
  }
}

const SECTIONS = [
  { key: 'errors',      label: 'Errors',      hint: 'Blocks import — fix these',      Icon: XCircle,       color: 'text-error',   dot: 'bg-error'   },
  { key: 'warnings',    label: 'Warnings',    hint: "Won't block import — worth a look", Icon: AlertTriangle, color: 'text-warning', dot: 'bg-warning' },
  { key: 'suggestions', label: 'Suggestions', hint: 'Optional — not required',        Icon: Lightbulb,     color: 'text-info',    dot: 'bg-info'    },
]

/**
 * Shows the ACF JSON in a read-only Monaco editor with inline squiggly
 * markers (hover to see the message) for every validation issue that could
 * be traced to a field/group key, plus a compact issue list next to it —
 * clicking an item jumps the editor to that line instead of just describing
 * it in prose.
 */
export default function ValidationCodeView({ json, validation }) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const [activeLine, setActiveLine] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)

  const prettyJson = useMemo(() => prettyPrint(json), [json])
  const annotated = useMemo(
    () => annotateValidationLines(prettyJson, validation),
    [prettyJson, validation]
  )

  const applyMarkers = () => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    const model = editor.getModel()
    if (!model) return
    monaco.editor.setModelMarkers(model, 'acf-validation', buildMonacoMarkers(annotated, monaco))
  }

  useEffect(applyMarkers, [annotated])

  const handleMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    monaco.editor.defineTheme('acf-dark', ACF_DARK_THEME)
    monaco.editor.setTheme('acf-dark')
    applyMarkers()
  }

  const jumpToLine = (line) => {
    const editor = editorRef.current
    if (!line || !editor) return
    // revealLineInCenter/setSelection don't expand collapsed regions — if the
    // target line is inside a fold, the editor just scrolls near it while the
    // real line stays hidden, and whatever unrelated field is still visible
    // below/above LOOKS like the flagged one. Unfold everything first so the
    // line you land on is actually the line the issue refers to.
    editor.trigger('acf-validation', 'editor.unfoldAll')
    editor.revealLineInCenter(line)
    const lineLength = editor.getModel()?.getLineMaxColumn(line) ?? 1
    editor.setSelection({ startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: lineLength })
    editor.focus()
    setActiveLine(line)
  }

  const hasAnyIssues = SECTIONS.some((s) => annotated[s.key].length > 0)

  const handleCopyFix = async (fix, itemKey) => {
    try {
      await navigator.clipboard.writeText(fix)
      setCopiedIndex(itemKey)
      toast.success('Fix copied')
      setTimeout(() => setCopiedIndex((cur) => (cur === itemKey ? null : cur)), 1500)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div className="flex gap-4 h-[560px] min-h-0">
      {/* Code */}
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-elevated overflow-hidden">
        <Editor
          height="100%"
          language="json"
          value={prettyJson}
          theme="acf-dark"
          onMount={handleMount}
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
            glyphMargin:           true,
            renderLineHighlight:   'all',
            folding:               true,
            lineNumbers:           'on',
            scrollbar: {
              verticalScrollbarSize:   6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

      {/* Issue list */}
      <div className="w-80 shrink-0 overflow-y-auto space-y-3 pr-1">
        {!hasAnyIssues && (
          <div className="text-xs text-dim text-center py-10">No issues to show.</div>
        )}

        {SECTIONS.map(({ key, label, hint, Icon, color, dot }) => {
          const items = annotated[key]
          if (items.length === 0) return null
          return (
            <div key={key} className="rounded-xl border border-edge bg-elevated overflow-hidden">
              <div className="px-3 py-2 border-b border-edge">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={color} />
                  <span className="text-xs font-semibold text-ink">{label}</span>
                  <span className={`ml-auto text-xs font-mono font-bold ${color}`}>{items.length}</span>
                </div>
                <div className="text-[10px] text-dim mt-0.5 ml-[19px]">{hint}</div>
              </div>
              <div className="divide-y divide-edge">
                {items.map((item, i) => {
                  const itemKey = `${key}-${i}`
                  return (
                    <div
                      key={i}
                      className={`px-3 py-2.5 ${activeLine === item.line && item.line ? 'bg-card' : ''}`}
                    >
                      <button
                        onClick={() => jumpToLine(item.line)}
                        disabled={!item.line}
                        title={item.line ? 'Jump to this line' : 'Could not locate this in the code'}
                        className={`w-full text-left flex items-start gap-2 rounded-md -mx-1 px-1 py-0.5 transition-colors ${
                          item.line ? 'cursor-pointer hover:bg-card' : 'cursor-default opacity-70'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${dot} mt-[5px] shrink-0`} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          {item.field && (
                            <div className="text-[10px] font-mono text-dim truncate">{item.field}</div>
                          )}
                          <div className="text-xs text-muted leading-relaxed">{item.message}</div>
                        </div>
                        {item.line ? (
                          <span className="text-[10px] text-dim shrink-0 flex items-center gap-0.5">
                            <MapPin size={9} /> L{item.line}
                          </span>
                        ) : (
                          <span className="text-[10px] text-dim shrink-0">—</span>
                        )}
                      </button>

                      {/* What to paste in, and where — only shown when Gemini
                          gave us an actual snippet rather than a general
                          structural note (fix is null for those). */}
                      {item.fix && (
                        <div className="mt-2 ml-3.5 rounded-lg border border-edge bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-edge">
                            <span className="text-[10px] text-dim">
                              {item.insertAfter
                                ? <>Add after <code className="text-accent-light">{item.insertAfter}</code></>
                                : 'Add this'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyFix(item.fix, itemKey)
                              }}
                              className="flex items-center gap-1 text-[10px] text-dim hover:text-muted cursor-pointer"
                            >
                              {copiedIndex === itemKey ? (
                                <><Check size={10} className="text-success" /> Copied</>
                              ) : (
                                <><Copy size={10} /> Copy</>
                              )}
                            </button>
                          </div>
                          <pre className="px-2.5 py-2 text-[10.5px] font-mono text-muted leading-relaxed overflow-x-auto whitespace-pre">
                            {item.fix}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
