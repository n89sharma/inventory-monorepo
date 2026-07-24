import { getAssetsForDeparted } from '@/data/api/asset-api'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import {
  isValidDepartedDateRange,
  resolveDepartedStatuses,
  resolveWarehouseScope,
  type AssetFilters,
} from '@/lib/filters/hooks'
import type { AssetSearchRow, OrgSummary, Warehouse } from 'shared-types'
import useSWR from 'swr'

export type SearchDepartedFilters = AssetFilters & {
  warehouses: Warehouse[]
  showOther: boolean
  fromDate: Date
  toDate: Date
  customer: OrgSummary | null
  invoiceReference: string
}

const SEARCH_DEPARTED_KEY = 'search-departed-assets'

export function useSearchDeparted(filters: SearchDepartedFilters) {
  const allStatuses = useReferenceDataStore((state) => state.statuses)
  const statuses = resolveDepartedStatuses(filters.showOther, allStatuses)
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)
  const ready =
    warehouses.length > 0 &&
    statuses.length > 0 &&
    isValidDepartedDateRange(filters.fromDate, filters.toDate)

  return useSWR<AssetSearchRow[]>(
    ready ? [SEARCH_DEPARTED_KEY, { ...filters, warehouses }] : null,
    ([, f]: [string, SearchDepartedFilters]) =>
      getAssetsForDeparted(
        f.warehouses,
        f.brand,
        f.assetTypes,
        f.readinesses,
        f.model?.model_name ?? f.modelQuery,
        f.meterMin,
        f.meterMax,
        f.cassettes,
        f.internalFinisher,
        f.customer,
        f.invoiceReference,
        statuses,
        f.fromDate,
        f.toDate,
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
