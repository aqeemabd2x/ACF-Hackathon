import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-2.5-flash'

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
      'Each item: { "field": "key_or_null", "message": "...", "severity": "error|warning|info" }.\n\n' +
      'ACF JSON:\n' + json
    )
    const text = cleanJson(result.response.text())
    return JSON.parse(text)
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
