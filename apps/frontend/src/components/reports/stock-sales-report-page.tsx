import { GridPageContent } from '@/components/app-layout/page-content'
import { MeterBandFilter } from '@/components/shared/filters/meter-band-filter'
import { ModelsFilter } from '@/components/shared/filters/models-filter'
import { AssetTypeFilterGroup } from '@/components/shared/filters/asset-type-filter-group'
import { TableToolbarEnd } from '@/components/shared/table-toolbar'
import { SalesWindowToggle } from '@/components/shared/filters/sales-window-toggle'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { FilterRow } from '@/components/shared/filter-row'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { createStockSalesColumns } from './stock-sales-table-columns'
import { DataGridWithoutResultCount } from '@/components/shared/data-table'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { ShareButton } from '@/components/shared/share-button'
import { useCan } from '@/hooks/use-can'
import { useStockSalesReport } from '@/hooks/use-stock-sales-report'
import {
  useMeterBandParam,
  useModelsParam,
  useSalesWindowParam,
  useStockSalesModeParam,
} from '@/lib/filters/hooks'
import {
  countAssetTypes,
  filterAssetsByType,
  resolveAssetTypeFilter,
  type AssetTypeCounts,
  type AssetTypeFilter,
} from '@/lib/asset-type-filter'
import { FILTER_PARSERS, type SalesWindowMonths, type StockSalesMode } from '@/lib/filters/parsers'
import { onHandDrilldownHref } from '@/lib/filters/serializers'
import {
  buildStockSalesGroups,
  summarizeStockSales,
  type StockSalesModelRow,
} from '@/lib/stock-sales-grouping'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import type { StockSalesReport } from 'shared-types'

const TABLE_LABEL = 'Stock & sales'
const ASSET_TYPE_PARAM_KEY = 'asset_type'

const EMPTY_REPORT: StockSalesReport = { stock: [], sale_prices: null }
const STOCK_MODE: StockSalesMode = 'stock'
const SOLD_MODE: StockSalesMode = 'sold'
const IN_STOCK_SORT = { id: 'in_stock_count', desc: true }
const SALES_SORT = { id: 'sales_count', desc: true }
const PROFIT_SORT = { id: 'profit', desc: true }

function defaultSort(mode: StockSalesMode, canViewProfit: boolean) {
  if (mode === STOCK_MODE) return IN_STOCK_SORT
  if (canViewProfit) return PROFIT_SORT
  return SALES_SORT
}
const NO_STOCK_MESSAGE = 'No on-hand assets match these filters.'

function emptyMessage(mode: StockSalesMode, months: SalesWindowMonths): string {
  if (mode === STOCK_MODE) return NO_STOCK_MESSAGE
  return `No sales in the last ${months} mo match these filters.`
}

function StockSalesSummaryStrip({
  rows,
  canViewSale,
}: {
  rows: StockSalesModelRow[]
  canViewSale: boolean
}): React.JSX.Element {
  const totals = summarizeStockSales(rows)
  return (
    <div className="flex w-full shrink-0 flex-wrap items-baseline gap-x-6 gap-y-1 px-2 py-1">
      <SummaryField label="Total In Stock" value={String(totals.in_stock_count)} />
      <SummaryField label="Total Held" value={String(totals.held_count)} />
      {canViewSale && <SummaryField label="Total Sales" value={String(totals.sales_count)} />}
    </div>
  )
}

function StockSalesModeToggle({
  mode,
  onModeChange,
}: {
  mode: StockSalesMode
  onModeChange: (next: StockSalesMode) => void
}): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={mode}
      onValueChange={(value) => {
        if (value === '') return
        onModeChange(value === SOLD_MODE ? SOLD_MODE : STOCK_MODE)
      }}
      aria-label="Report mode"
    >
      <ToggleGroupItem value={STOCK_MODE}>Stock</ToggleGroupItem>
      <ToggleGroupItem value={SOLD_MODE}>Sold</ToggleGroupItem>
    </ToggleGroup>
  )
}

function StockSalesBody({
  mode,
  sort,
  months,
  rows,
  hasRowsOfAnyType,
  assetTypeFilter,
  assetTypeCounts,
  onAssetTypeFilterChange,
  isLoading,
  columnVisibility,
  getRowHref,
}: {
  mode: StockSalesMode
  sort: { id: string; desc: boolean }
  months: SalesWindowMonths
  rows: StockSalesModelRow[]
  hasRowsOfAnyType: boolean
  assetTypeFilter: AssetTypeFilter
  assetTypeCounts: AssetTypeCounts
  onAssetTypeFilterChange: (next: AssetTypeFilter) => void
  isLoading: boolean
  columnVisibility: VisibilityState
  getRowHref: (row: StockSalesModelRow) => string
}): React.JSX.Element | null {
  const columns = useMemo(() => createStockSalesColumns(months), [months])
  if (!hasRowsOfAnyType) {
    if (isLoading) return null
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {emptyMessage(mode, months)}
      </p>
    )
  }

  return (
    <DataGridWithoutResultCount
      key={mode}
      label={TABLE_LABEL}
      columns={columns}
      data={rows}
      defaultSort={sort}
      getRowHref={getRowHref}
      columnVisibility={columnVisibility}
      renderToolbar={() => (
        <TableToolbarEnd>
          <AssetTypeFilterGroup
            value={assetTypeFilter}
            counts={assetTypeCounts}
            onValueChange={onAssetTypeFilterChange}
          />
        </TableToolbarEnd>
      )}
    />
  )
}

export function StockSalesReportPage(): React.JSX.Element {
  const [requestedMode, setMode] = useStockSalesModeParam()
  const [months, setMonths] = useSalesWindowParam()
  const [band, setBand] = useMeterBandParam()
  const { models, modelQuery, setModels, setModelQuery, clear: clearModels } = useModelsParam()

  const canViewPurchase = useCan('view_purchase_price')
  const canViewSale = useCan('view_sale_price')
  const canViewProfitability = useCan('view_profitability_report')
  const canViewProfit = canViewSale && canViewPurchase && canViewProfitability
  const mode = canViewSale ? requestedMode : STOCK_MODE

  const { data: report = EMPTY_REPORT, isLoading } = useStockSalesReport(months)
  const [assetTypeParam, setAssetTypeParam] = useQueryState(
    ASSET_TYPE_PARAM_KEY,
    FILTER_PARSERS.asset_type,
  )
  const rowsOfAnyType = useMemo(
    () => buildStockSalesGroups(report, { band, models }, mode),
    [report, band, models, mode],
  )
  const assetTypeCounts = useMemo(() => countAssetTypes(rowsOfAnyType), [rowsOfAnyType])
  const defaultAssetTypeFilter = resolveAssetTypeFilter(null, assetTypeCounts)
  const assetTypeFilter = resolveAssetTypeFilter(assetTypeParam, assetTypeCounts)
  const visibleRows = useMemo(
    () => filterAssetsByType(rowsOfAnyType, assetTypeFilter),
    [rowsOfAnyType, assetTypeFilter],
  )
  const handleAssetTypeFilterChange = (newFilter: AssetTypeFilter) =>
    void setAssetTypeParam(newFilter === defaultAssetTypeFilter ? null : newFilter)
  const getRowHref = useCallback(
    (row: StockSalesModelRow) => onHandDrilldownHref({ row, band }),
    [band],
  )

  const columnVisibility = useMemo<VisibilityState>(
    () => ({
      avg_purchase_cost: canViewPurchase,
      avg_total_cost: canViewPurchase,
      median_sale_price: canViewSale,
      margin_percent: canViewPurchase && canViewSale,
      sales_count: canViewSale,
      profit: canViewProfit,
    }),
    [canViewPurchase, canViewSale, canViewProfit],
  )

  return (
    <GridPageContent>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Stock &amp; Sales Report</h1>
            {isLoading ? (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            ) : null}
          </div>
          <ShareButton />
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <FilterRow>
            {canViewSale && <StockSalesModeToggle mode={mode} onModeChange={setMode} />}
            {canViewSale && (
              <SalesWindowToggle
                months={months}
                onMonthsChange={setMonths}
                getLabel={(option) => `${option} mo`}
              />
            )}
            <ModelsFilter
              selection={models}
              query={modelQuery}
              onSelectionChange={setModels}
              onQueryChange={setModelQuery}
              onClear={clearModels}
            />
            <MeterBandFilter selection={band} onSelectionChange={setBand} />
          </FilterRow>
        </form>
      </GridPageHeader>
      <div
        className={cn('flex min-h-0 flex-1 flex-col transition-opacity', isLoading && 'opacity-50')}
      >
        <StockSalesSummaryStrip rows={visibleRows} canViewSale={canViewSale} />
        <StockSalesBody
          mode={mode}
          sort={defaultSort(mode, canViewProfit)}
          months={months}
          rows={visibleRows}
          hasRowsOfAnyType={rowsOfAnyType.length > 0}
          assetTypeFilter={assetTypeFilter}
          assetTypeCounts={assetTypeCounts}
          onAssetTypeFilterChange={handleAssetTypeFilterChange}
          isLoading={isLoading}
          columnVisibility={columnVisibility}
          getRowHref={getRowHref}
        />
      </div>
    </GridPageContent>
  )
}
