import { getLocations } from '@/data/api/location-api'
import useSWR from 'swr'

const LOCATIONS_KEY = 'locations'

export function useLocations() {
  return useSWR(LOCATIONS_KEY, getLocations)
}
