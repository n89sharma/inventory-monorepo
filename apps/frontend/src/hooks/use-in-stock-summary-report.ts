import { getInStockSummaryReport } from '@/data/api/report-api'
import { salesWindowStart } from '@/lib/model-price-history-summary'
import type { InStockSummaryReport } from 'shared-types'
import useSWR from 'swr'

const IN_STOCK_SUMMARY_REPORT_KEY = 'in-stock-summary-report'
const SALES_WINDOW_MONTHS = 6

export function useInStockSummaryReport() {
  return useSWR<InStockSummaryReport>(
    [IN_STOCK_SUMMARY_REPORT_KEY, salesWindowStart(SALES_WINDOW_MONTHS)],
    ([, salesFrom]: [string, string]) => getInStockSummaryReport(salesFrom),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
