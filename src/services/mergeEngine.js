function parseGroups(jsonStr) {
  const raw = JSON.parse(jsonStr)
  return Array.isArray(raw) ? raw : [raw]
}

function fieldsDiffer(a, b) {
  return a.label !== b.label || a.name !== b.name || a.type !== b.type
}

function randomHex() {
  return Math.random().toString(16).slice(2, 10)
}

/**
 * Analyse every field in File A relative to File B.
 * Returns an array of group objects, each with a `fields` array that includes status info.
 *
 * Status values:
 *   'new'       – key not in B at all → will be added
 *   'update'    – same key exists in B but values differ → will overwrite
 *   'identical' – same key AND same values → no-op (disabled in picker)
 *   'conflict'  – different key but same name as a B field → needs resolution
 */
export function analyzeFieldsFromA(jsonStrA, jsonStrB) {
  const groupsA  = parseGroups(jsonStrA)
  const groupsB  = parseGroups(jsonStrB)
  const groupMapB = new Map(groupsB.map(g => [g.key, g]))

  return groupsA.map(gA => {
    const gB       = groupMapB.get(gA.key)
    const bKeyMap  = new Map((gB?.fields || []).map(f => [f.key,  f]))
    const bNameMap = new Map((gB?.fields || []).map(f => [f.name, f]))

    const fields = (gA.fields || []).map(f => {
      let status, conflictWith = null

      if (bKeyMap.has(f.key)) {
        const bField = bKeyMap.get(f.key)
        status       = fieldsDiffer(f, bField) ? 'update' : 'identical'
        conflictWith = bField
      } else if (f.name && bNameMap.has(f.name)) {
        status       = 'conflict'
        conflictWith = bNameMap.get(f.name)
      } else {
        status = 'new'
      }

      return { field: f, status, conflictWith }
    })

    return { group: gA, existsInB: !!gB, fields }
  })
}

/**
 * Merge only the user-selected fields from A into B (base).
 *
 * @param {string}            jsonStrA
 * @param {string}            jsonStrB
 * @param {Set<string>}       selectedKeys   field keys from A to transfer
 * @param {Record<string,string>} resolutions  fieldKey → 'useSource'|'keepBase'|'keepBoth'
 */
export function performSelectiveMerge(jsonStrA, jsonStrB, selectedKeys, resolutions) {
  const groupsA = parseGroups(jsonStrA)
  // Deep-clone B so we never mutate the parsed original
  const groupsB = JSON.parse(JSON.stringify(parseGroups(jsonStrB)))
  const mapB    = new Map(groupsB.map(g => [g.key, g]))

  for (const gA of groupsA) {
    const selected = (gA.fields || []).filter(f => selectedKeys.has(f.key))
    if (selected.length === 0) continue

    if (mapB.has(gA.key)) {
      // Group exists in B — patch individual fields
      const gB       = mapB.get(gA.key)
      const bKeyMap  = new Map((gB.fields || []).map(f => [f.key,  f]))
      const bNameMap = new Map((gB.fields || []).map(f => [f.name, f]))

      for (const fA of selected) {
        if (bKeyMap.has(fA.key)) {
          // Same key → overwrite
          const idx = gB.fields.findIndex(f => f.key === fA.key)
          if (idx >= 0) gB.fields[idx] = { ...fA }
        } else if (fA.name && bNameMap.has(fA.name)) {
          // Name collision → apply resolution (default: replace B with A)
          const res         = resolutions[fA.key] ?? 'useSource'
          const conflicting = bNameMap.get(fA.name)
          if (res === 'useSource') {
            const idx = gB.fields.findIndex(f => f.key === conflicting.key)
            if (idx >= 0) gB.fields[idx] = { ...fA }
          } else if (res === 'keepBoth') {
            gB.fields.push({
              ...fA,
              key:   `field_${randomHex()}`,
              name:  fA.name + '_copy',
              label: (fA.label || fA.name) + ' (Copy)',
            })
          }
          // 'keepBase' → do nothing
        } else {
          // Truly new → append
          gB.fields.push({ ...fA })
        }
      }
    } else {
      // Group doesn't exist in B → create it with only the selected fields
      groupsB.push({ ...gA, fields: selected.map(f => ({ ...f })) })
    }
  }

  return JSON.stringify(groupsB, null, 2)
}
