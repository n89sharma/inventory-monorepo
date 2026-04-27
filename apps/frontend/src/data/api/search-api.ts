import { api } from '@/data/api/axios-client'
import type { ApiResponse, GlobalSearchResult } from 'shared-types'

const emptyResult: GlobalSearchResult = { assets: [], arrivals: [], departures: [], transfers: [], holds: [], invoices: [] }

export async function getGlobalSearchResults(q: string): Promise<GlobalSearchResult> {
  try {
    const { data } = await api.get<ApiResponse<GlobalSearchResult>>('/search', { params: { q } })
    return data.success ? data.data : emptyResult
  } catch {
    return emptyResult
  }
}
