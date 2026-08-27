import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { DepartedSummaryStrip } from '@/components/asset-search/departed-summary-strip'
import { CustomerFilter } from '@/components/shared/filters/customer-filter'
import { DepartedDateRangeFilter } from '@/components/shared/filters/departed-date-range-filter'
import { InvoiceReferenceFilter } from '@/components/shared/filters/invoice-reference-filter'
import { UserFilter } from '@/components/shared/filters/user-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { Toggle } from '@/components/shadcn/toggle'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { useSearchDeparted } from '@/hooks/use-search-departed'
import {
  useAssetFilters,
  useCustomerParam,
  useDepartedRangeParam,
  useInvoiceRefParam,
  useSalespersonParam,
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
  ['sp'],
  ['invoiceref'],
] as const satisfies FilterParamGroups

export function SearchDepartedPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [showOther, setShowOther] = useShowOtherParam()
  const { from, to, setRange } = useDepartedRangeParam()
  const [customer, setCustomer] = useCustomerParam()
  const [salesperson, setSalesperson] = useSalespersonParam()
  const [invoiceReference, setInvoiceReference] = useInvoiceRefParam()

  const filters = useMemo(
    () => ({
      ...assetFilters,
      warehouses,
      showOther,
      fromDate: from,
      toDate: to,
      customer,
      salesperson,
      invoiceReference,
    }),
    [assetFilters, warehouses, showOther, from, to, customer, salesperson, invoiceReference],
  )

  const clearCustomer = useCallback(() => setCustomer(null), [setCustomer])
  const clearSalesperson = useCallback(() => setSalesperson(null), [setSalesperson])
  const clearInvoiceReference = useCallback(() => setInvoiceReference(''), [setInvoiceReference])

  // Held as one element so a URL write that touches none of these filters, such as sorting
  // the grid, re-renders neither the controls nor the popovers they own.
  const scopeFilters = useMemo(
    () => (
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
          onClear={clearCustomer}
        />
        <UserFilter
          selection={salesperson}
          onSelectionChange={setSalesperson}
          onClear={clearSalesperson}
          placeholder="Salesperson"
          clearLabel="Clear salesperson"
        />
        <InvoiceReferenceFilter
          value={invoiceReference}
          onChange={setInvoiceReference}
          onClear={clearInvoiceReference}
        />
      </>
    ),
    [
      warehouses,
      setWarehouses,
      showOther,
      setShowOther,
      from,
      to,
      setRange,
      customer,
      setCustomer,
      clearCustomer,
      salesperson,
      setSalesperson,
      clearSalesperson,
      invoiceReference,
      setInvoiceReference,
      clearInvoiceReference,
    ],
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
      summaryStrip={<DepartedSummaryStrip assets={assets} />}
    >
      <AssetFilterBar scopeFilterGroups={SCOPE_FILTER_GROUPS} scopeFilters={scopeFilters} />
    </AssetSearchPage>
  )
}
