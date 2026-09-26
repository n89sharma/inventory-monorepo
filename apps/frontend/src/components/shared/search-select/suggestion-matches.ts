import { rankMatches } from '@/lib/rank-matches'

const DISALLOWED_CHARS_PATTERN = /[^a-zA-Z0-9\s\-_.]/g
const SUGGESTION_LIMIT = 10

export function stripDisallowedChars(raw: string): string {
  return raw.replace(DISALLOWED_CHARS_PATTERN, '')
}

export function rankSuggestions<T>(
  options: T[],
  query: string,
  getSearchText: (item: T) => string,
): T[] {
  if (!query.trim()) return []
  return rankMatches(options, query, getSearchText).slice(0, SUGGESTION_LIMIT)
}
