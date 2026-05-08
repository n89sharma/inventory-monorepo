import { getGlobalSearchResults as getGlobalSearchResultsApi } from '@/data/api/search-api'
import type { GlobalSearchResult } from 'shared-types'
import { create } from 'zustand'

interface SearchStore {
  searchGlobal: (query: string) => Promise<GlobalSearchResult>
}

export const useSearchStore = create<SearchStore>(() => ({
  searchGlobal: (query) => getGlobalSearchResultsApi(query)
}))
