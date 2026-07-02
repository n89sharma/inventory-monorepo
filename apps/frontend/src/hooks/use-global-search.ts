import { getGlobalSearchResults } from '@/data/api/search-api'
import { useEffect, useState } from 'react'
import type { GlobalSearchResult, SearchEntityType } from 'shared-types'
import useSWR from 'swr'

const GLOBAL_SEARCH_KEY = 'global-search'
const SEARCH_DEBOUNCE_MS = 150

export const ASSET_SEARCH_TYPES: SearchEntityType[] = ['assets']
export const HOLD_SEARCH_TYPES: SearchEntityType[] = ['holds']

const EMPTY_RESULT: GlobalSearchResult = {
  assets: [],
  arrivals: [],
  departures: [],
  transfers: [],
  holds: [],
  invoices: [],
}

export function useGlobalSearch(
  query: string,
  types?: SearchEntityType[],
): { results: GlobalSearchResult; isLoading: boolean } {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const { data, isValidating } = useSWR<GlobalSearchResult>(
    debouncedQuery ? [GLOBAL_SEARCH_KEY, debouncedQuery, types] : null,
    ([, q]: [string, string, SearchEntityType[] | undefined]) => getGlobalSearchResults(q, types),
    { revalidateOnFocus: false, revalidateOnReconnect: false, keepPreviousData: true },
  )

  const results = query ? (data ?? EMPTY_RESULT) : EMPTY_RESULT
  const isLoading = Boolean(query) && (query !== debouncedQuery || isValidating)

  return { results, isLoading }
}
