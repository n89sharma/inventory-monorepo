import { api } from '@/data/api/axios-client'
import type { GlobalSearchResult, SearchEntityType } from 'shared-types'
import { GlobalSearchResultSchema } from 'shared-types'

const emptyResult: GlobalSearchResult = {
  assets: [],
  arrivals: [],
  departures: [],
  transfers: [],
  holds: [],
  invoices: [],
}

export async function getGlobalSearchResults(
  q: string,
  types?: SearchEntityType[],
): Promise<GlobalSearchResult> {
  try {
    const { data } = await api.get<GlobalSearchResult>('/search', { params: { q, types } })
    return GlobalSearchResultSchema.parse(data)
  } catch {
    return emptyResult
  }
}
