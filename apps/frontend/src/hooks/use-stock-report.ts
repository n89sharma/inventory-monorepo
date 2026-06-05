import { getStockReportAssets } from '@/data/api/asset-api'
import type { StockReportFilters } from '@/lib/stock-report-url-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const STOCK_REPORT_KEY = 'stock-report-assets'

function hasWarehouse(f: StockReportFilters): boolean {
  return f.warehouses.length > 0
}

export function useStockReport(filters: StockReportFilters) {
  return useSWR<AssetSearchRow[]>(
    hasWarehouse(filters) ? [STOCK_REPORT_KEY, filters] : null,
    ([, f]: [string, StockReportFilters]) => getStockReportAssets(
      f.warehouses,
      f.brand,
      f.assetTypes,
      f.readinesses,
      f.model?.model_name ?? f.modelQuery,
      f.meterMin,
      f.meterMax,
      f.includeHeld,
    ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
