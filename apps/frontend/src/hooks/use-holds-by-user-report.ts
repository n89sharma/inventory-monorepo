import { getHoldsByUserReport } from '@/data/api/report-api'
import type { HoldsByUserReport } from 'shared-types'
import useSWR from 'swr'

const HOLDS_BY_USER_REPORT_KEY = 'holds-by-user-report'

export function useHoldsByUserReport() {
  return useSWR<HoldsByUserReport>(HOLDS_BY_USER_REPORT_KEY, getHoldsByUserReport, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}
