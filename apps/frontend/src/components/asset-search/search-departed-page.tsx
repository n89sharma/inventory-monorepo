import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { CustomerFilter } from '@/components/shared/filters/customer-filter'
import { DepartedDateRangeFilter } from '@/components/shared/filters/departed-date-range-filter'
import { InvoiceReferenceFilter } from '@/components/shared/filters/invoice-reference-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { Toggle } from '@/components/shadcn/toggle'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { useSearchDeparted } from '@/hooks/use-search-departed'
import {
  useAssetFilters,
  useCustomerParam,
  useDepartedRangeParam,
  useInvoiceRefParam,
  useShowOtherParam,
  useWarehousesParam,
  type FilterParamGroups,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DEPARTED_AT_DESC_SORT = { id: 'departed_at', desc: true } as const
// `from`/`to` are the page's scope, not a filter: they always carry a value, so counting
// them would report a filter as active before the user touches anything.
const SCOPE_FILTER_GROUPS = [
  ['wh'],
  ['other'],
  ['customer'],
  ['invoiceref'],
] as const satisfies FilterParamGroups

export function SearchDepartedPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [showOther, setShowOther] = useShowOtherParam()
  const { from, to, setRange } = useDepartedRangeParam()
  const [customer, setCustomer] = useCustomerParam()
  const [invoiceReference, setInvoiceReference] = useInvoiceRefParam()

  const filters = useMemo(
    () => ({
      ...assetFilters,
      warehouses,
      showOther,
      fromDate: from,
      toDate: to,
      customer,
      invoiceReference,
    }),
    [assetFilters, warehouses, showOther, from, to, customer, invoiceReference],
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchDeparted(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <AssetSearchPage
      title="Departed"
      navContext="departed"
      savedViewPageKey="search_departed"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      defaultSort={DEPARTED_AT_DESC_SORT}
    >
      <AssetFilterBar
        scopeFilterGroups={SCOPE_FILTER_GROUPS}
        scopeFilters={
          <>
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
            <Toggle
              variant="outline"
              pressed={showOther}
              onPressedChange={setShowOther}
              aria-label="Show scrapped assets"
            >
              {showOther ? 'Show Sold' : 'Show Scrapped'}
            </Toggle>
            <DepartedDateRangeFilter from={from} to={to} onChange={setRange} />
            <CustomerFilter
              selection={customer}
              onSelectionChange={setCustomer}
              onClear={() => setCustomer(null)}
            />
            <InvoiceReferenceFilter
              value={invoiceReference}
              onChange={setInvoiceReference}
              onClear={() => setInvoiceReference('')}
            />
          </>
        }
      />
    </AssetSearchPage>
  )
}
