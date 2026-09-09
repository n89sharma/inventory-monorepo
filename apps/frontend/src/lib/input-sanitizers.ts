// Mirrors the character class the API accepts for free-text search
// (GlobalSearchQuerySchema and the asset controller's serial/reference fields).
const DISALLOWED_SEARCH_TEXT_CHARS = /[^a-zA-Z0-9\s\-_.]/g
const DISALLOWED_SCANNED_CODE_CHARS = /[^a-zA-Z0-9._-]/g

export function sanitizeSearchText(raw: string): string {
  return raw.replace(DISALLOWED_SEARCH_TEXT_CHARS, '')
}

export function sanitizeScannedCode(raw: string): string {
  return raw.replace(DISALLOWED_SCANNED_CODE_CHARS, '')
}
