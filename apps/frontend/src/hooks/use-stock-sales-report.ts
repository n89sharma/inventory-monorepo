import { getStockSalesReport } from '@/data/api/report-api'
import { salesWindowStart } from '@/lib/model-price-history-summary'
import type { StockSalesReport } from 'shared-types'
import useSWR from 'swr'

const STOCK_SALES_REPORT_KEY = 'stock-sales-report'
const SALES_WINDOW_MONTHS = 6

export function useStockSalesReport() {
  return useSWR<StockSalesReport>(
    [STOCK_SALES_REPORT_KEY, salesWindowStart(SALES_WINDOW_MONTHS)],
    ([, salesFrom]: [string, string]) => getStockSalesReport(salesFrom),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
