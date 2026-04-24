import { getArrivalDetail } from '@/data/api/arrival-api'
import useSWR, { preload } from 'swr'

export const arrivalDetailKey = (arrivalNumber: string) => `arrival:${arrivalNumber}`

export function useArrivalDetail(arrivalNumber: string) {
  return useSWR(arrivalDetailKey(arrivalNumber), () => getArrivalDetail(arrivalNumber))
}

export function preloadArrivalDetail(arrivalNumber: string) {
  preload(arrivalDetailKey(arrivalNumber), () => getArrivalDetail(arrivalNumber))
}
