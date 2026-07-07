import useAppStore from '../../../store/useAppStore'

export default function InspectorPanel() {
  const currentJson = useAppStore((s) => s.currentJson)

  if (!currentJson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-40 text-center py-8">
        <div className="text-sm font-medium text-muted mb-1">No JSON loaded</div>
        <div className="text-xs text-dim leading-relaxed">
          Generate or import ACF JSON to inspect its structure here.
        </div>
      </div>
    )
  }

  let groups = []
  let parseError = false

  try {
    const parsed = JSON.parse(currentJson)
    groups = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    parseError = true
  }

  if (parseError) {
    return (
      <div className="text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
        Invalid JSON — cannot parse.
      </div>
    )
  }

  const allFields = groups.flatMap((g) => flattenFields(g.fields || []))
  const typeCounts = allFields.reduce((acc, f) => {
    if (f.type) acc[f.type] = (acc[f.type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div>
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Field Groups" value={groups.length} />
          <StatCard label="Total Fields" value={allFields.length} />
        </div>
      </div>

      {/* Field types */}
      {Object.keys(typeCounts).length > 0 && (
        <div>
          <SectionLabel>Field Types</SectionLabel>
          <div className="space-y-1.5">
            {Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-muted capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className="text-ink font-mono bg-elevated px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Groups */}
      <div>
        <SectionLabel>Field Groups</SectionLabel>
        <div className="space-y-2">
          {groups.map((group, i) => (
            <div
              key={i}
              className="rounded-lg bg-elevated p-3 border border-edge space-y-1"
            >
              <div className="text-xs font-semibold text-ink truncate">
                {group.title || 'Untitled Group'}
              </div>
              <div className="text-[10px] text-dim font-mono truncate">{group.key}</div>
              <div className="text-[10px] text-muted">
                {(group.fields || []).length} top-level fields
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function flattenFields(fields) {
  if (!Array.isArray(fields)) return []
  return fields.flatMap((f) => [
    f,
    ...flattenFields(f.sub_fields || []),
    ...flattenFields(f.layouts?.flatMap((l) => l.sub_fields || []) || []),
  ])
}

function StatCard({ label, value }) {
  return (
    <div className="bg-elevated rounded-lg p-3 border border-edge text-center">
      <div className="text-xl font-bold text-ink">{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-2">
      {children}
    </div>
  )
}
