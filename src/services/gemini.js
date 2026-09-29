import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-3.6-flash'

const BASE_INSTRUCTION = `You are an expert WordPress ACF (Advanced Custom Fields) JSON specialist.

STRICT OUTPUT RULES:
- Return ONLY valid JSON. Absolutely nothing else.
- Never use markdown or code fences.
- Never add explanations, comments, or prose.
- Follow the official ACF JSON export format exactly.
- Generate unique field keys: field_[8 random lowercase hex chars]
- Generate unique group keys: group_[8 random lowercase hex chars]
- All field objects must include: key, label, name, type, instructions, required, conditional_logic, wrapper.
- Preserve existing field keys when editing.`

function parseApiError(error) {
  const msg = error?.message ?? String(error)

  if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
    const retryMatch = msg.match(/retry in ([\d.]+)s/i)
    const seconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null
    let text = 'Gemini API quota exceeded.'
    if (seconds) text += ` Retry in ${seconds} seconds.`
    text += ' Check your usage at https://ai.dev/rate-limit'
    const err = new Error(text)
    err.code = 'QUOTA_EXCEEDED'
    err.retryAfter = seconds
    return err
  }

  if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
    return new Error('Gemini model not available. Check that your API key is valid and active at https://aistudio.google.com.')
  }

  if (msg.includes('401') || msg.includes('403')) {
    return new Error('Invalid Gemini API key. Go to Settings and re-enter your key.')
  }

  return error
}

function getApiKey() {
  const raw = localStorage.getItem('acf-builder-v1')
  if (!raw) throw new Error('API key not configured. Open Settings and add your Gemini API key.')
  let state
  try {
    state = JSON.parse(raw).state
  } catch {
    throw new Error('Could not read stored settings.')
  }
  if (!state?.geminiApiKey) {
    throw new Error('Gemini API key not configured. Open Settings to add it.')
  }
  return state.geminiApiKey
}

function buildModel(apiKey) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    systemInstruction: BASE_INSTRUCTION,
  })
}

const DESIGN_TO_CODE_INSTRUCTION = `You are an expert WordPress developer and front-end engineer who converts
screenshots of website design sections into production-ready, ACF (Advanced Custom Fields) driven WordPress
components.

Given an image of a website section you must:
1. Identify layout structure, sections/containers, headings, paragraphs, images, buttons/links, cards, icons,
   backgrounds, spacing, alignment, typography hierarchy, columns and responsive layout considerations.
2. Decide which content should be editable through ACF (repeated groups like cards become a Repeater; images
   become Image fields; short copy becomes Text; long copy becomes Textarea/WYSIWYG; CTAs become Text + URL).
3. Generate a valid ACF field group JSON array using the standard ACF export schema (key, label, name, type,
   instructions, required, conditional_logic, wrapper, and sub_fields for repeater/group/flexible_content types).
   Generate unique field keys as field_[8 random lowercase hex chars] and group keys as group_[8 random lowercase
   hex chars].
4. Generate a complete WordPress PHP template that:
   - Reads every field with get_field() / have_rows() / the_row() / get_sub_field() using the exact field names
     defined in the ACF JSON (never invent fields that aren't defined, never leave a defined field unused).
   - Contains the full HTML structure for the section, using semantic HTML5 elements.
   - Escapes all dynamic output with esc_html(), esc_url(), esc_attr(), or wp_kses_post() as appropriate.
   - Wraps repeated content in have_rows()/the_row() loops.
   - Gracefully skips/hides elements when a field is empty (use if ( $value ) checks).
   - Uses CSS classes that exactly match the class names used in the generated CSS.
   - Never hardcodes content that should be managed through ACF.
5. Generate CSS that reproduces the design as closely as reasonably possible:
   - Clean, maintainable, reusable classes (no ids, no !important, no inline styles).
   - Flexbox/Grid layout, sensible max-widths, padding, margins and gaps.
   - Typography (font sizes, weights, line-heights), colors, borders, border-radius and backgrounds.
   - Responsive behavior with media queries for desktop, tablet (max-width: 1024px) and mobile (max-width: 640px).
   - Class names identical to the ones used in the PHP template and previewHtml.
6. Generate "previewHtml": the same markup as the PHP template's rendered output, but with realistic sample
   placeholder content substituted for every PHP/ACF call (no PHP tags at all), so it can be rendered directly in
   a browser together with the CSS to preview the section.
7. List short "assumptions" you had to make when exact details couldn't be determined from the image (fonts,
   exact colors/spacing, ambiguous repeated content, etc).

STRICT OUTPUT RULES:
- Return ONLY a single valid JSON object. Nothing else — no markdown, no code fences, no prose.
- The JSON object must have exactly these keys: "acf", "php", "css", "previewHtml", "assumptions".
- "acf" is an array of ACF field group objects (same schema as a standard ACF JSON export).
- "php", "css" and "previewHtml" are plain strings containing the full contents of each file, properly escaped
  as JSON string values.
- "assumptions" is an array of short strings (may be empty).
- Keep the ACF field names, PHP get_field()/get_sub_field() calls, and CSS class names perfectly consistent with
  one another — they describe the same component.`

function buildVisionModel(apiKey) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    systemInstruction: DESIGN_TO_CODE_INSTRUCTION,
  })
}

function cleanJson(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

export async function generateACF(prompt) {
  const m = buildModel(getApiKey())
  try {
    const result = await m.generateContent(
      'Generate a complete ACF field group JSON for the following description. ' +
      'Return only a valid JSON array:\n\n' + prompt
    )
    const text = cleanJson(result.response.text())
    JSON.parse(text)
    return text
  } catch (err) {
    throw parseApiError(err)
  }
}

export async function editACF(instructions, existingJson) {
  const m = buildModel(getApiKey())
  try {
    const result = await m.generateContent(
      `You have this ACF JSON:\n${existingJson}\n\n` +
      `Apply ONLY these changes: ${instructions}\n\n` +
      `Return the complete modified JSON array. Preserve all existing field keys and unrelated settings.`
    )
    const text = cleanJson(result.response.text())
    JSON.parse(text)
    return text
  } catch (err) {
    throw parseApiError(err)
  }
}

export async function validateACF(json) {
  const m = buildModel(getApiKey())
  try {
    const result = await m.generateContent(
      'Analyze this ACF JSON for issues. ' +
      'Return a JSON object: { "score": 0-100, "errors": [], "warnings": [], "suggestions": [] }. ' +
      'Each item: { "field": "key_or_null", "message": "...", "severity": "error|warning|info", ' +
      '"fix": "...", "insertAfter": "property_name_or_null" }.\n\n' +
      'For "fix": when the issue is a missing or malformed property on a specific field/group, give the ' +
      'exact, copy-pasteable JSON for that property (or properties) as it should appear inside that field/group ' +
      'object — real syntax, correct comma, ready to paste in as-is. If the issue has no single snippet that ' +
      'fixes it (a structural/architectural suggestion, a cross-field relationship issue, etc.), set "fix" to null.\n' +
      'For "insertAfter": the name of the existing property inside that same field/group object that the fix ' +
      'should be inserted directly after (e.g. "instructions", "required", "type"). Set to null when "fix" is null ' +
      'or there is no natural anchor point.\n\n' +
      'ACF JSON:\n' + json
    )
    const text = cleanJson(result.response.text())
    return JSON.parse(text)
  } catch (err) {
    throw parseApiError(err)
  }
}

/**
 * Applies a batch of validation issues (as returned by `validateACF`) to an
 * existing ACF JSON in a single pass, using each issue's "fix"/"insertAfter"
 * hint where present and the model's own judgment where it's null.
 *
 * @param {string} json
 * @param {Array<{ field?: string, message: string, severity?: string, fix?: string, insertAfter?: string }>} issues
 * @returns {Promise<string>} the corrected ACF JSON
 */
export async function applyValidationFixes(json, issues) {
  const m = buildModel(getApiKey())
  try {
    const issuesPayload = issues.map(({ field, message, severity, fix, insertAfter }) => ({
      field:       field || null,
      message,
      severity:    severity || null,
      fix:         fix || null,
      insertAfter: insertAfter || null,
    }))

    const result = await m.generateContent(
      'You have this ACF JSON:\n' + json + '\n\n' +
      'Apply fixes for ALL of the following validation issues found in it:\n' +
      JSON.stringify(issuesPayload, null, 2) + '\n\n' +
      'For each issue, use its "fix" snippet as the exact change to make when provided (insert/merge it into ' +
      'the field/group named in "insertAfter"/"field"). Where "fix" is null, use your own judgment to resolve ' +
      'the issue described in "message". Do not change anything that is not related to one of these issues — ' +
      'preserve all other existing field keys, values, ordering and structure exactly as-is.\n\n' +
      'Return the complete corrected JSON array. Return ONLY valid JSON, nothing else.'
    )
    const text = cleanJson(result.response.text())
    JSON.parse(text)
    return text
  } catch (err) {
    throw parseApiError(err)
  }
}

export async function mergeSuggestion(fileA, fileB) {
  const m = buildModel(getApiKey())
  try {
    const result = await m.generateContent(
      'Analyze these two ACF JSON files for merging. ' +
      'Return JSON: { "conflicts": [], "safeToMerge": [], "suggestions": [] }. ' +
      'Each conflict: { "key": "...", "fieldA": {}, "fieldB": {}, "recommendation": "..." }.\n\n' +
      'File A:\n' + fileA + '\n\nFile B:\n' + fileB
    )
    const text = cleanJson(result.response.text())
    return JSON.parse(text)
  } catch (err) {
    throw parseApiError(err)
  }
}

export async function generateFieldSuggestions(prompt) {
  const m = buildModel(getApiKey())
  try {
    const result = await m.generateContent(
      `Suggest 6-8 ACF field definitions for: "${prompt}". ` +
      `Return a JSON array: [{ "type": "...", "label": "...", "name": "...", "reason": "..." }].`
    )
    const text = cleanJson(result.response.text())
    return JSON.parse(text)
  } catch (err) {
    throw parseApiError(err)
  }
}

/**
 * Analyzes a design screenshot and generates a connected ACF JSON + PHP
 * template + CSS + static preview markup for it.
 *
 * @param {{ base64Data: string, mimeType: string, notes?: string }} input
 * @returns {Promise<{ acf: Array, php: string, css: string, previewHtml: string, assumptions: string[] }>}
 */
export async function generateDesignToCode({ base64Data, mimeType, notes }) {
  const m = buildVisionModel(getApiKey())
  try {
    const instructionText =
      'Analyze the attached website design screenshot and generate the ACF JSON, PHP template, CSS, ' +
      'and preview HTML as instructed by your system prompt.' +
      (notes?.trim() ? `\n\nAdditional developer notes/requirements:\n${notes.trim()}` : '')

    const result = await m.generateContent([
      { text: instructionText },
      { inlineData: { mimeType, data: base64Data } },
    ])

    const text = cleanJson(result.response.text())
    const parsed = JSON.parse(text)

    if (!parsed || !Array.isArray(parsed.acf) || typeof parsed.php !== 'string' || typeof parsed.css !== 'string') {
      throw new Error('AI response was missing required fields (acf, php, css).')
    }
    if (typeof parsed.previewHtml !== 'string') parsed.previewHtml = ''
    if (!Array.isArray(parsed.assumptions)) parsed.assumptions = []

    return parsed
  } catch (err) {
    throw parseApiError(err)
  }
}