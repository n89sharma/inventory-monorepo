import { defaultFilter } from 'cmdk'

// Ranks options against a query: contiguous substring matches first (ordered by
// match position, then shorter text), falling back to cmdk's fuzzy scorer only
// when no substring matches exist. Empty query returns options unfiltered.
export function rankMatches<T>(
  options: T[],
  query: string,
  getSearchText: (item: T) => string,
): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return options

  const substringMatches = options
    .map((option) => ({ option, index: getSearchText(option).toLowerCase().indexOf(needle) }))
    .filter((result) => result.index !== -1)
    .sort(
      (a, b) =>
        a.index - b.index || getSearchText(a.option).length - getSearchText(b.option).length,
    )
    .map((result) => result.option)

  if (substringMatches.length > 0) return substringMatches

  return options
    .map((option) => ({ option, score: defaultFilter(getSearchText(option), query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.option)
}
