import { api } from '@/data/api/axios-client'
import type { GlobalSearchResult } from 'shared-types'
import { GlobalSearchResultSchema } from 'shared-types'

const emptyResult: GlobalSearchResult = { assets: [], arrivals: [], departures: [], transfers: [], holds: [], invoices: [] }

export async function getGlobalSearchResults(q: string): Promise<GlobalSearchResult> {
  try {
    const { data } = await api.get<GlobalSearchResult>('/search', { params: { q } })
    return GlobalSearchResultSchema.parse(data)
  } catch {
    return emptyResult
  }
}
