import { getStorePartDetail, getStoreParts } from '@/data/api/store-part-api'
import useSWR, { mutate, preload } from 'swr'

const STORE_LIST_KEY = 'store:list'

export const storePartDetailKey = (partId: number) => `store:${partId}`

export function useStorePartsList() {
  return useSWR(STORE_LIST_KEY, getStoreParts)
}

export function useStorePartDetail(partId: number) {
  return useSWR(storePartDetailKey(partId), () => getStorePartDetail(partId))
}

export function preloadStorePartDetail(partId: number) {
  preload(storePartDetailKey(partId), () => getStorePartDetail(partId))
}

export function invalidateStorePartLists() {
  return mutate(STORE_LIST_KEY)
}
