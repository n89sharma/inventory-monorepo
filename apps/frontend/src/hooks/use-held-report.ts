import { getHeldReport } from '@/data/api/report-api'
import type { HeldReport } from 'shared-types'
import useSWR from 'swr'

const HELD_REPORT_KEY = 'held-report'

export function useHeldReport() {
  return useSWR<HeldReport>(HELD_REPORT_KEY, getHeldReport, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}
