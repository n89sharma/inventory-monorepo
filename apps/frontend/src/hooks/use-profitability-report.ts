import { getProfitabilityReport } from '@/data/api/report-api'
import type { ProfitabilityCubeRow } from 'shared-types'
import useSWR from 'swr'

const PROFITABILITY_REPORT_KEY = 'profitability-report'

export function useProfitabilityReport(year: number) {
  return useSWR<ProfitabilityCubeRow[]>(
    [PROFITABILITY_REPORT_KEY, year],
    ([, y]: [string, number]) => getProfitabilityReport(y),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
