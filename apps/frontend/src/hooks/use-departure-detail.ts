import { getDepartureDetail } from '@/data/api/departure-api'
import useSWR, { preload } from 'swr'

export const departureDetailKey = (departureNumber: string) => `departure:${departureNumber}`

export function useDepartureDetail(departureNumber: string) {
  return useSWR(departureDetailKey(departureNumber), () => getDepartureDetail(departureNumber))
}

export function preloadDepartureDetail(departureNumber: string) {
  preload(departureDetailKey(departureNumber), () => getDepartureDetail(departureNumber))
}
