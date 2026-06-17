import { getStorePartDetail, getStoreParts } from '@/data/api/store-part-api'
import useSWR, { mutate, preload } from 'swr'

export const STORE_LIST_KEY = 'store:list'

export const storePartDetailKey = (partNumber: string) => `store:${partNumber}`

export function useStorePartsList() {
  return useSWR(STORE_LIST_KEY, getStoreParts)
}

export function useStorePartDetail(partNumber: string) {
  return useSWR(storePartDetailKey(partNumber), () => getStorePartDetail(partNumber))
}

export function preloadStorePartDetail(partNumber: string) {
  preload(storePartDetailKey(partNumber), () => getStorePartDetail(partNumber))
}

export function invalidateStorePartLists() {
  return mutate(STORE_LIST_KEY)
}
