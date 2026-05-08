import type { CollectionHistory } from 'shared-types'
import useSWR from 'swr'

export function useCollectionHistory(cacheKey: string, fetcher: () => Promise<CollectionHistory>) {
  return useSWR(cacheKey, fetcher)
}
