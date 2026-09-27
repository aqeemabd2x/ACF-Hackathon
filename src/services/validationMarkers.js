/**
 * Bridges AI validation results (which only carry a field KEY and a message)
 * back to a specific line in the pretty-printed ACF JSON, so issues can be
 * shown inline in the code editor instead of as a disconnected text list.
 *
 * The Gemini validation prompt asks for `field` to be the field/group key
 * (or null when the issue isn't tied to one field) — but as a safety net
 * this also tries matching on `name` and `label` in case the model returns
 * one of those instead.
 */

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findLine(lines, field) {
  if (!field) return null
  const escaped = escapeRegExp(field)
  const patterns = [
    new RegExp(`"key"\\s*:\\s*"${escaped}"`),
    new RegExp(`"name"\\s*:\\s*"${escaped}"`),
    new RegExp(`"label"\\s*:\\s*"${escaped}"`),
  ]
  for (let i = 0; i < lines.length; i++) {
    if (patterns.some((re) => re.test(lines[i]))) return i + 1 // Monaco lines are 1-indexed
  }
  return null
}

/**
 * @param {string} prettyJson - pretty-printed JSON (must match what's shown in the editor)
 * @param {{errors?: Array, warnings?: Array, suggestions?: Array}} validation
 * @returns {{errors: Array, warnings: Array, suggestions: Array}} same shape, each item gaining a `line`
 *   (number|null). Any `fix`/`insertAfter` fields Gemini returned pass through unchanged.
 */
export function annotateValidationLines(prettyJson, validation) {
  const lines = (prettyJson || '').split('\n')
  const annotate = (items) => (items || []).map((item) => ({ ...item, line: findLine(lines, item.field) }))
  return {
    errors: annotate(validation?.errors),
    warnings: annotate(validation?.warnings),
    suggestions: annotate(validation?.suggestions),
  }
}

const SEVERITY_KEYS = ['errors', 'warnings', 'suggestions']

/**
 * @param {ReturnType<typeof annotateValidationLines>} annotated
 * @param {typeof import('monaco-editor')} monaco
 * @returns {Array} Monaco IMarkerData[]
 */
export function buildMonacoMarkers(annotated, monaco) {
  const severityFor = {
    errors: monaco.MarkerSeverity.Error,
    warnings: monaco.MarkerSeverity.Warning,
    suggestions: monaco.MarkerSeverity.Info,
  }

  const markers = []
  for (const key of SEVERITY_KEYS) {
    for (const item of annotated[key]) {
      if (!item.line) continue
      const message = item.fix
        ? `${item.message}\n\nAdd${item.insertAfter ? ` after "${item.insertAfter}"` : ''}:\n${item.fix}`
        : item.message
      markers.push({
        severity: severityFor[key],
        message,
        startLineNumber: item.line,
        startColumn: 1,
        endLineNumber: item.line,
        endColumn: 1000,
      })
    }
  }
  return markers
}
