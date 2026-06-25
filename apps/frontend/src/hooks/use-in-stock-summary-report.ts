import { getInStockSummaryReport } from '@/data/api/report-api'
import type { InStockSummaryReport } from 'shared-types'
import useSWR from 'swr'

const IN_STOCK_SUMMARY_REPORT_KEY = 'in-stock-summary-report'

export function useInStockSummaryReport() {
  return useSWR<InStockSummaryReport>(IN_STOCK_SUMMARY_REPORT_KEY, getInStockSummaryReport, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}
