const VALID_TYPES = new Set([
  'text', 'textarea', 'wysiwyg', 'number', 'email', 'url', 'password',
  'image', 'gallery', 'file',
  'select', 'checkbox', 'radio', 'button_group',
  'true_false', 'range',
  'date_picker', 'date_time_picker', 'time_picker',
  'link', 'relationship', 'post_object', 'user', 'taxonomy',
  'group', 'repeater', 'flexible_content', 'clone',
  'accordion', 'tab', 'message',
])

function mkIssue(type, field, message) {
  return { type, field, message }
}

function countFields(fields) {
  if (!Array.isArray(fields)) return 0
  return fields.reduce((acc, f) => {
    let n = 1
    if (Array.isArray(f.sub_fields))  n += countFields(f.sub_fields)
    if (Array.isArray(f.layouts))     n += f.layouts.reduce((a, l) => a + countFields(l.sub_fields || []), 0)
    return acc + n
  }, 0)
}

function validateFields(fields, parentLabel, seenKeys, result) {
  const namesInScope = new Set()

  for (let i = 0; i < fields.length; i++) {
    const f     = fields[i]
    const label = f.label || f.name || `field[${i}]`

    // ── key ──────────────────────────────────────────────────────────
    if (!f.key) {
      result.errors.push(mkIssue('missing_key', label, `"${label}" in "${parentLabel}" is missing a field key.`))
    } else if (seenKeys.has(f.key)) {
      result.errors.push(mkIssue('duplicate_key', f.key, `Duplicate key "${f.key}" on field "${label}".`))
    } else {
      seenKeys.add(f.key)
    }

    // ── name ─────────────────────────────────────────────────────────
    if (!f.name) {
      result.warnings.push(mkIssue('missing_name', label, `"${label}" is missing a name (slug).`))
    } else {
      if (namesInScope.has(f.name)) {
        result.warnings.push(mkIssue('duplicate_name', f.name, `Duplicate name "${f.name}" within "${parentLabel}".`))
      }
      namesInScope.add(f.name)
    }

    // ── type ─────────────────────────────────────────────────────────
    if (!f.type) {
      result.errors.push(mkIssue('missing_type', label, `"${label}" is missing a field type.`))
    } else if (!VALID_TYPES.has(f.type)) {
      result.warnings.push(mkIssue('unknown_type', label, `Unknown field type "${f.type}" on "${label}".`))
    }

    // ── recurse into nested ───────────────────────────────────────────
    if (Array.isArray(f.sub_fields) && f.sub_fields.length > 0) {
      validateFields(f.sub_fields, label, seenKeys, result)
    }
    if (Array.isArray(f.layouts)) {
      for (const layout of f.layouts) {
        if (Array.isArray(layout.sub_fields)) {
          validateFields(
            layout.sub_fields,
            `${label} > ${layout.name || 'layout'}`,
            seenKeys,
            result
          )
        }
      }
    }
  }
}

/**
 * Validate an ACF JSON string.
 * @param {string} jsonString
 * @returns {{ valid, score, errors, warnings, suggestions, stats, parsed }}
 */
export function validateACFJson(jsonString) {
  const result = {
    valid:       false,
    score:       0,
    errors:      [],
    warnings:    [],
    suggestions: [],
    stats:       { groups: 0, fields: 0 },
    parsed:      null,
  }

  // 1. Parse ─────────────────────────────────────────────────────────
  let raw
  try {
    raw = JSON.parse(jsonString)
  } catch (e) {
    result.errors.push(mkIssue('syntax', null, `Invalid JSON syntax: ${e.message}`))
    return result
  }

  // 2. Normalise to array ────────────────────────────────────────────
  const groups = Array.isArray(raw) ? raw : [raw]
  result.parsed      = groups
  result.stats.groups = groups.length

  const seenKeys = new Set()

  // 3. Validate each group ───────────────────────────────────────────
  for (let gi = 0; gi < groups.length; gi++) {
    const g      = groups[gi]
    const gLabel = g.title || `Group ${gi + 1}`

    if (!g.key) {
      result.errors.push(mkIssue('missing_key', gLabel, `Group "${gLabel}" is missing a key.`))
    } else if (seenKeys.has(g.key)) {
      result.errors.push(mkIssue('duplicate_key', g.key, `Duplicate group key: "${g.key}".`))
    } else {
      seenKeys.add(g.key)
    }

    if (!g.title) {
      result.warnings.push(mkIssue('missing_title', gLabel, `Group at index ${gi} has no title.`))
    }

    if (!Array.isArray(g.fields)) {
      result.errors.push(mkIssue('missing_fields', gLabel, `Group "${gLabel}" has no fields array.`))
      continue
    }

    if (g.fields.length === 0) {
      result.warnings.push(mkIssue('empty_group', gLabel, `Group "${gLabel}" contains no fields.`))
    }

    if (!Array.isArray(g.location) || g.location.length === 0) {
      result.suggestions.push(
        mkIssue('no_location', gLabel, `Group "${gLabel}" has no location rules — it won't appear in the WordPress admin.`)
      )
    }

    result.stats.fields += countFields(g.fields)
    validateFields(g.fields, gLabel, seenKeys, result)
  }

  result.valid = result.errors.length === 0
  result.score = Math.max(0, 100 - result.errors.length * 15 - result.warnings.length * 5)

  return result
}
