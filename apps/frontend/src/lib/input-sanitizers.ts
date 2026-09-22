// Mirrors the character class the API accepts for free-text search
// (GlobalSearchQuerySchema and the asset controller's serial/reference fields).
const DISALLOWED_SEARCH_TEXT_CHARS = /[^a-zA-Z0-9\s\-_.]/g
const DISALLOWED_SCANNED_CODE_CHARS = /[^a-zA-Z0-9._-]/g
const DISALLOWED_DECIMAL_CHARS = /[^\d.]/g

export function sanitizeSearchText(raw: string): string {
  return raw.replace(DISALLOWED_SEARCH_TEXT_CHARS, '')
}

export function sanitizeScannedCode(raw: string): string {
  return raw.replace(DISALLOWED_SCANNED_CODE_CHARS, '')
}

// Keeps digits and a single decimal point, so a half-typed value like "500." survives.
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(DISALLOWED_DECIMAL_CHARS, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}
