import { PageContent } from '@/components/app-layout/page-content'
import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { ModelFilter } from '@/components/shared/filters/model-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { IN_STOCK_SUMMARY_COLUMNS } from '@/components/table-columns/in-stock-summary-columns'
import { DataTable } from '@/components/shadcn/data-table'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { ShareButton } from '@/components/shared/share-button'
import { useCan } from '@/hooks/use-can'
import { useInStockSummaryReport } from '@/hooks/use-in-stock-summary-report'
import {
  useAssetTypesParam,
  useBrandParam,
  useModelParam,
  useWarehousesParam,
} from '@/lib/filters/hooks'
import { inStockDrilldownHref } from '@/lib/filters/serializers'
import {
  buildInStockSummaryGroups,
  type InStockSummaryTableRow,
} from '@/lib/in-stock-summary-grouping'
import { METER_BAND_LEGEND } from '@/lib/meter-band-display'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { AssetType, Brand, InStockSummaryReport, ModelSummary, Warehouse } from 'shared-types'

const EMPTY_ROWS: InStockSummaryReport = []
const DEFAULT_SORT = { id: 'asset_count', desc: true }

type InStockSummaryFilters = {
  warehouses: Warehouse[]
  brand: Brand | null
  assetTypes: AssetType[]
  model: ModelSummary | null
}

function buildFilteredGroups(
  rows: InStockSummaryReport,
  filters: InStockSummaryFilters,
): InStockSummaryTableRow[] {
  const warehouseIds = new Set(filters.warehouses.map((w) => w.id))
  const assetTypeIds = new Set(filters.assetTypes.map((t) => t.id))
  const filtered = rows.filter(
    (row) =>
      (warehouseIds.size === 0 || warehouseIds.has(row.warehouse_id)) &&
      (filters.brand === null || row.brand_id === filters.brand.id) &&
      (assetTypeIds.size === 0 || assetTypeIds.has(row.asset_type_id)) &&
      (filters.model === null || row.model_id === filters.model.id),
  )
  return buildInStockSummaryGroups(filtered)
}

function MeterBandLegend(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Meter band</span>
      {METER_BAND_LEGEND.map((band) => (
        <span key={band.label}>
          {band.label} ({band.range})
        </span>
      ))}
    </div>
  )
}

function getSubRows(row: InStockSummaryTableRow): InStockSummaryTableRow[] | undefined {
  return 'subRows' in row ? row.subRows : undefined
}

function getRowHref(row: InStockSummaryTableRow): string {
  return 'subRows' in row ? '' : inStockDrilldownHref(row)
}

function InStockSummaryBody({
  rows,
  isLoading,
  columnVisibility,
}: {
  rows: InStockSummaryTableRow[]
  isLoading: boolean
  columnVisibility: VisibilityState
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
    <div className="flex flex-col gap-2">
      <MeterBandLegend />
      <DataTable
        columns={IN_STOCK_SUMMARY_COLUMNS}
        data={rows}
        defaultSort={DEFAULT_SORT}
        getSubRows={getSubRows}
        getRowHref={getRowHref}
        columnVisibility={columnVisibility}
      />
    </div>
  )
}

export function InStockSummaryReportPage(): React.JSX.Element {
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  const { model, modelQuery, setModel, setModelQuery, clear: clearModel } = useModelParam()

  const { data: rows = EMPTY_ROWS, isLoading } = useInStockSummaryReport()
  const visibleRows = useMemo(
    () => buildFilteredGroups(rows, { warehouses, brand, assetTypes, model }),
    [rows, warehouses, brand, assetTypes, model],
  )

  const canViewPurchase = useCan('view_purchase_price')
  const columnVisibility = useMemo<VisibilityState>(
    () => ({ avg_purchase_cost: canViewPurchase, avg_total_cost: canViewPurchase }),
    [canViewPurchase],
  )

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">In Stock Report</h1>
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
        <form
          className="flex flex-row flex-wrap items-center gap-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
          <BrandFilter
            selection={brand}
            onSelectionChange={setBrand}
            onClear={() => setBrand(null)}
          />
          <AssetTypeFilter selection={assetTypes} onSelectionChange={setAssetTypes} />
          <ModelFilter
            selection={model}
            query={modelQuery}
            onSelectionChange={setModel}
            onQueryChange={setModelQuery}
            onClear={clearModel}
          />
        </form>
      </StickyPageHeader>
      <PageContent>
        <div className={cn('transition-opacity', isLoading && 'opacity-50')}>
          <InStockSummaryBody
            rows={visibleRows}
            isLoading={isLoading}
            columnVisibility={columnVisibility}
          />
        </div>
      </PageContent>
    </>
  )
}
