import { GridPageContent } from '@/components/app-layout/page-content'
import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { MeterBandFilter } from '@/components/shared/filters/meter-band-filter'
import { ModelsFilter } from '@/components/shared/filters/models-filter'
import { FilterRow } from '@/components/shared/filter-row'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { STOCK_SALES_COLUMNS } from './stock-sales-table-columns'
import { DataGrid } from '@/components/shared/data-table'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { ShareButton } from '@/components/shared/share-button'
import { useCan } from '@/hooks/use-can'
import { useStockSalesReport } from '@/hooks/use-stock-sales-report'
import {
  useAssetTypesParam,
  useBrandParam,
  useMeterBandParam,
  useModelsParam,
  useStockSalesModeParam,
} from '@/lib/filters/hooks'
import type { StockSalesMode } from '@/lib/filters/parsers'
import { onHandDrilldownHref } from '@/lib/filters/serializers'
import { buildStockSalesGroups, type StockSalesModelRow } from '@/lib/stock-sales-grouping'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import type { StockSalesReport } from 'shared-types'

const TABLE_LABEL = 'Stock & sales'

const EMPTY_REPORT: StockSalesReport = { stock: [], sale_prices: null }
const STOCK_MODE: StockSalesMode = 'stock'
const SOLD_MODE: StockSalesMode = 'sold'
const DEFAULT_SORTS = {
  stock: { id: 'in_stock_count', desc: true },
  sold: { id: 'sales_count', desc: true },
} as const satisfies Record<StockSalesMode, { id: string; desc: boolean }>
const EMPTY_MESSAGES = {
  stock: 'No on-hand assets match these filters.',
  sold: 'No sales in the last 6 months match these filters.',
} as const satisfies Record<StockSalesMode, string>

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
  rows,
  isLoading,
  columnVisibility,
  getRowHref,
}: {
  mode: StockSalesMode
  rows: StockSalesModelRow[]
  isLoading: boolean
  columnVisibility: VisibilityState
  getRowHref: (row: StockSalesModelRow) => string
}): React.JSX.Element | null {
  if (rows.length === 0) {
    if (isLoading) return null
    return <p className="py-16 text-center text-sm text-muted-foreground">{EMPTY_MESSAGES[mode]}</p>
  }

  return (
    <DataGrid
      key={mode}
      label={TABLE_LABEL}
      columns={STOCK_SALES_COLUMNS}
      data={rows}
      defaultSort={DEFAULT_SORTS[mode]}
      getRowHref={getRowHref}
      columnVisibility={columnVisibility}
    />
  )
}

export function StockSalesReportPage(): React.JSX.Element {
  const [requestedMode, setMode] = useStockSalesModeParam()
  const [band, setBand] = useMeterBandParam()
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  const { models, modelQuery, setModels, setModelQuery, clear: clearModels } = useModelsParam()

  const canViewPurchase = useCan('view_purchase_price')
  const canViewSale = useCan('view_sale_price')
  const mode = canViewSale ? requestedMode : STOCK_MODE

  const { data: report = EMPTY_REPORT, isLoading } = useStockSalesReport()
  const visibleRows = useMemo(
    () => buildStockSalesGroups(report, { band, brand, assetTypes, models }, mode),
    [report, band, brand, assetTypes, models, mode],
  )
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
    }),
    [canViewPurchase, canViewSale],
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
            <MeterBandFilter selection={band} onSelectionChange={setBand} />
            <BrandFilter
              selection={brand}
              onSelectionChange={setBrand}
              onClear={() => setBrand(null)}
            />
            <AssetTypeFilter selection={assetTypes} onSelectionChange={setAssetTypes} />
            <ModelsFilter
              selection={models}
              query={modelQuery}
              onSelectionChange={setModels}
              onQueryChange={setModelQuery}
              onClear={clearModels}
            />
          </FilterRow>
        </form>
      </GridPageHeader>
      <div
        className={cn('flex min-h-0 flex-1 flex-col transition-opacity', isLoading && 'opacity-50')}
      >
        <StockSalesBody
          mode={mode}
          rows={visibleRows}
          isLoading={isLoading}
          columnVisibility={columnVisibility}
          getRowHref={getRowHref}
        />
      </div>
    </GridPageContent>
  )
}
