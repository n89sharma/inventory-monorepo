import { getHoldDetail } from '@/data/api/hold-api'
import useSWR, { preload } from 'swr'

export const holdDetailKey = (holdNumber: string) => `hold:${holdNumber}`

export function useHoldDetail(holdNumber: string) {
  return useSWR(holdDetailKey(holdNumber), () => getHoldDetail(holdNumber))
}

export function preloadHoldDetail(holdNumber: string) {
  preload(holdDetailKey(holdNumber), () => getHoldDetail(holdNumber))
}
