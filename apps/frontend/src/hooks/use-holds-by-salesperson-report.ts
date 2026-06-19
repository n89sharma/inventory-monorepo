import { getHoldsBySalespersonReport } from '@/data/api/report-api'
import type { HoldsBySalespersonReport } from 'shared-types'
import useSWR from 'swr'

const HOLDS_BY_SALESPERSON_REPORT_KEY = 'holds-by-salesperson-report'

export function useHoldsBySalespersonReport() {
  return useSWR<HoldsBySalespersonReport>(
    HOLDS_BY_SALESPERSON_REPORT_KEY,
    getHoldsBySalespersonReport,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
