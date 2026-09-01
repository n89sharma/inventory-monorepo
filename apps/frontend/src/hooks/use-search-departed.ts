import { getAssetsForDeparted } from '@/data/api/asset-api'
import { useStatuses } from '@/hooks/use-reference-data'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { toDateParam } from '@/lib/date-param'
import {
  isValidDepartedDateRange,
  resolveDepartedStatuses,
  resolveWarehouseScope,
  type AssetFilters,
} from '@/lib/filters/hooks'
import type { AssetSearchRow, OrgDetail, User, Warehouse } from 'shared-types'
import useSWR from 'swr'

export type SearchDepartedFilters = AssetFilters & {
  warehouses: Warehouse[]
  showOther: boolean
  fromDate: Date
  toDate: Date
  customer: OrgDetail | null
  salesperson: User | null
  invoiceReference: string
}

const SEARCH_DEPARTED_KEY = 'search-departed-assets'

export function useSearchDeparted(filters: SearchDepartedFilters) {
  const allStatuses = useStatuses()
  const statuses = resolveDepartedStatuses(filters.showOther, allStatuses)
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)
  const ready =
    warehouses.length > 0 &&
    statuses.length > 0 &&
    isValidDepartedDateRange(filters.fromDate, filters.toDate)

  // The key carries the calendar day rather than the Date, so two visits to the same
  // range agree; the request itself still takes the Dates.
  const key = {
    ...filters,
    warehouses,
    fromDate: toDateParam(filters.fromDate),
    toDate: toDateParam(filters.toDate),
  }

  return useSWR<AssetSearchRow[]>(
    ready ? [SEARCH_DEPARTED_KEY, key] : null,
    () =>
      getAssetsForDeparted(
        warehouses,
        filters.brand,
        filters.assetTypes,
        filters.readinesses,
        filters.model?.model_name ?? filters.modelQuery,
        filters.meterMin,
        filters.meterMax,
        filters.cassettes,
        filters.internalFinisher,
        filters.customer,
        filters.salesperson,
        filters.invoiceReference,
        statuses,
        filters.fromDate,
        filters.toDate,
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
