import { GridPageContent } from '@/components/app-layout/page-content'
import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { MeterBandFilter } from '@/components/shared/filters/meter-band-filter'
import { ModelsFilter } from '@/components/shared/filters/models-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { FilterRow } from '@/components/shared/filter-row'
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
  useWarehousesParam,
} from '@/lib/filters/hooks'
import { onHandDrilldownHref } from '@/lib/filters/serializers'
import { buildStockSalesGroups, type StockSalesModelRow } from '@/lib/stock-sales-grouping'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import type {
  AssetType,
  Brand,
  StockSalesSalePriceGroup,
  StockSalesReport,
  MeterBand,
  ModelSummary,
  Warehouse,
} from 'shared-types'

const TABLE_LABEL = 'Stock & sales'

const EMPTY_REPORT: StockSalesReport = { stock: [], sale_prices: null }
const NO_SALE_PRICE_GROUPS: StockSalesSalePriceGroup[] = []
const DEFAULT_SORT = { id: 'in_stock_count', desc: true }

type StockSalesFilters = {
  warehouses: Warehouse[]
  band: MeterBand | null
  brand: Brand | null
  assetTypes: AssetType[]
  models: ModelSummary[]
}

function buildFilteredGroups(
  report: StockSalesReport,
  filters: StockSalesFilters,
): StockSalesModelRow[] {
  const warehouseIds = new Set(filters.warehouses.map((w) => w.id))
  const assetTypeIds = new Set(filters.assetTypes.map((t) => t.id))
  const modelIds = new Set(filters.models.map((m) => m.id))
  const filtered = report.stock.filter(
    (row) =>
      (warehouseIds.size === 0 || warehouseIds.has(row.warehouse_id)) &&
      (filters.band === null || row.meter_band === filters.band) &&
      (filters.brand === null || row.brand_id === filters.brand.id) &&
      (assetTypeIds.size === 0 || assetTypeIds.has(row.asset_type_id)) &&
      (modelIds.size === 0 || modelIds.has(row.model_id)),
  )
  return buildStockSalesGroups(filtered, report.sale_prices ?? NO_SALE_PRICE_GROUPS, filters.band)
}

function StockSalesBody({
  rows,
  isLoading,
  columnVisibility,
  getRowHref,
}: {
  rows: StockSalesModelRow[]
  isLoading: boolean
  columnVisibility: VisibilityState
  getRowHref: (row: StockSalesModelRow) => string
}): React.JSX.Element | null {
  if (rows.length === 0) {
    if (isLoading) return null
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No in-stock assets match these filters.
      </p>
    )
  }

  return (
    <DataGrid
      label={TABLE_LABEL}
      columns={STOCK_SALES_COLUMNS}
      data={rows}
      defaultSort={DEFAULT_SORT}
      getRowHref={getRowHref}
      columnVisibility={columnVisibility}
    />
  )
}

export function StockSalesReportPage(): React.JSX.Element {
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [band, setBand] = useMeterBandParam()
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  const { models, modelQuery, setModels, setModelQuery, clear: clearModels } = useModelsParam()

  const { data: report = EMPTY_REPORT, isLoading } = useStockSalesReport()
  const visibleRows = useMemo(
    () => buildFilteredGroups(report, { warehouses, band, brand, assetTypes, models }),
    [report, warehouses, band, brand, assetTypes, models],
  )
  const getRowHref = useCallback(
    (row: StockSalesModelRow) => onHandDrilldownHref({ row, warehouses, band }),
    [warehouses, band],
  )

  const canViewPurchase = useCan('view_purchase_price')
  const canViewSale = useCan('view_sale_price')
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
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
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
          rows={visibleRows}
          isLoading={isLoading}
          columnVisibility={columnVisibility}
          getRowHref={getRowHref}
        />
      </div>
    </GridPageContent>
  )
}
