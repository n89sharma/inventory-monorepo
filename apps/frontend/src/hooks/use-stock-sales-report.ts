import { getStockSalesReport } from '@/data/api/report-api'
import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { salesWindowStart } from '@/lib/model-price-history-summary'
import type { StockSalesReport } from 'shared-types'
import useSWR from 'swr'

const STOCK_SALES_REPORT_KEY = 'stock-sales-report'

export function useStockSalesReport(months: SalesWindowMonths) {
  return useSWR<StockSalesReport>(
    [STOCK_SALES_REPORT_KEY, salesWindowStart(months)],
    ([, salesFrom]: [string, string]) => getStockSalesReport(salesFrom),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    },
  )
}
