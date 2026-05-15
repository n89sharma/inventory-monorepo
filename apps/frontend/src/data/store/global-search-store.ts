import { getGlobalSearchResults as getGlobalSearchResultsApi } from '@/data/api/search-api'
import type { GlobalSearchResult } from 'shared-types'
import { create } from 'zustand'

interface GlobalSearchStore {
  searchGlobal: (query: string) => Promise<GlobalSearchResult>
}

export const useGlobalSearchStore = create<GlobalSearchStore>(() => ({
  searchGlobal: (query) => getGlobalSearchResultsApi(query)
}))
