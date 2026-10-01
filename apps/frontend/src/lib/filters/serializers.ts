import type { AssetColumnId } from '@/components/table-columns/asset-search-columns'
import {
  getDefaultCollectionFromDate,
  DEFAULT_DEPARTED_RANGE_DAYS,
  getDefaultFromDate,
  getToday,
  getDefaultYear,
} from '@/lib/filters/defaults'
import {
  DEFAULT_SALES_WINDOW_MONTHS,
  FILTER_PARSERS,
  type SalesWindowMonths,
} from '@/lib/filters/parsers'
import { METER_BANDS } from '@/lib/model-price-history-summary'
import { createSerializer } from 'nuqs'
import type { StockSalesModelRow } from '@/lib/stock-sales-grouping'
import type { AssetType, Brand, MeterBand, OrgDetail, User, Warehouse } from 'shared-types'

const HELD_DRILLDOWN_COLUMN_IDS = [
  'serial_number',
  'status',
  'held_by',
  'hold_created_for',
  'hold_customer',
  'hold_created_at',
  'days_held',
] as const satisfies readonly AssetColumnId[]

const HELD_DRILLDOWN_SORT = { id: 'days_held', desc: true } as const

const STORE_LIST_PATH = '/store'
const ONHAND_PATH = '/search/onhand'
const DEPARTED_PATH = '/search/departed'
export const MODEL_PRICE_HISTORY_PATH = '/reports/model-price-history'
const PROFITABILITY_REPORT_PATH = '/reports/profitability'

const BAND_BOUNDS = {
  LOW: METER_BANDS[0],
  MEDIUM: METER_BANDS[1],
  HIGH: METER_BANDS[2],
} as const satisfies Record<
  Exclude<MeterBand, 'UNKNOWN'>,
  { min: number | null; max: number | null }
>

const serializeWarehouse = createSerializer({ warehouse: FILTER_PARSERS.warehouse })
const serializeAssetSearch = createSerializer({ wh: FILTER_PARSERS.wh, type: FILTER_PARSERS.type })
const serializeDrilldown = createSerializer({
  wh: FILTER_PARSERS.wh,
  brand: FILTER_PARSERS.brand,
  type: FILTER_PARSERS.type,
  models: FILTER_PARSERS.models,
  meter_min: FILTER_PARSERS.meter_min,
  meter_max: FILTER_PARSERS.meter_max,
})
const serializeDeparted = createSerializer({
  wh: FILTER_PARSERS.wh,
  from: FILTER_PARSERS.from,
  to: FILTER_PARSERS.to,
  brand: FILTER_PARSERS.brand,
  customer: FILTER_PARSERS.customer,
  sp: FILTER_PARSERS.sp,
})
const serializeDepartedSearch = createSerializer({
  wh: FILTER_PARSERS.wh,
  type: FILTER_PARSERS.type,
  from: FILTER_PARSERS.from,
  to: FILTER_PARSERS.to,
})
const serializeDateRange = createSerializer({ from: FILTER_PARSERS.from, to: FILTER_PARSERS.to })
const serializeProfitability = createSerializer({
  year: FILTER_PARSERS.year,
})
const serializePriceHistory = createSerializer({
  model: FILTER_PARSERS.model,
  range: FILTER_PARSERS.range,
})
const serializeModels = createSerializer({ models: FILTER_PARSERS.models })
const serializeHeld = createSerializer({
  heldfor: FILTER_PARSERS.heldfor,
  holdcustomer: FILTER_PARSERS.holdcustomer,
  cols: FILTER_PARSERS.cols,
  sort: FILTER_PARSERS.sort,
})

export function buildStoreListPath(warehouse: Warehouse | null): string {
  return buildStorePartsPathByWarehouseId(warehouse?.id ?? null)
}

export function buildStorePartsPathByWarehouseId(warehouseId: number | null): string {
  return serializeWarehouse(STORE_LIST_PATH, {
    warehouse: warehouseId === null ? null : [warehouseId],
  })
}

export function buildStorePartPath(partId: number, warehouseId: number | null): string {
  const path = `${STORE_LIST_PATH}/${partId}`
  if (warehouseId === null) return path
  return serializeWarehouse(path, { warehouse: [warehouseId] })
}

export function onHandDrilldownHref(params: {
  row: StockSalesModelRow
  band: MeterBand | null
}): string {
  const { row, band } = params
  const bounds = band === null || band === 'UNKNOWN' ? null : BAND_BOUNDS[band]
  return serializeDrilldown(ONHAND_PATH, {
    brand: row.brand_id,
    type: [row.asset_type_id],
    models: [row.model_id],
    meter_min: bounds?.min ?? null,
    meter_max: bounds?.max ?? null,
  })
}

// Vendor is deliberately absent: the departed search has no arrival-origin filter, so it
// is the one profitability dimension the drilldown cannot carry.
export function departedDrilldownHref(params: {
  from: Date
  to: Date
  warehouses: Warehouse[]
  brand: Brand | null
  customer: OrgDetail | null
  salesperson: User | null
}): string {
  const { from, to, warehouses, brand, customer, salesperson } = params
  return serializeDeparted(DEPARTED_PATH, {
    wh: warehouses.length > 0 ? warehouses.map((warehouse) => warehouse.id) : null,
    from,
    to,
    brand: brand?.id ?? null,
    customer: customer?.id ?? null,
    sp: salesperson?.id ?? null,
  })
}

export function modelPriceHistoryHref(modelId: number, months: SalesWindowMonths): string {
  return serializePriceHistory(MODEL_PRICE_HISTORY_PATH, {
    model: modelId,
    range: months === DEFAULT_SALES_WINDOW_MONTHS ? null : months,
  })
}

export function buildOnHandModelPath(modelId: number): string {
  return serializeModels(ONHAND_PATH, { models: [modelId] })
}

export function buildSearchOnHandUrl(selection: {
  heldForId?: number
  holdCustomerId?: number
}): string {
  return serializeHeld(ONHAND_PATH, {
    heldfor: selection.heldForId ?? null,
    holdcustomer: selection.holdCustomerId ?? null,
    cols: [...HELD_DRILLDOWN_COLUMN_IDS],
    sort: HELD_DRILLDOWN_SORT,
  })
}

export function buildProfitabilityReportPath(): string {
  return serializeProfitability(PROFITABILITY_REPORT_PATH, {
    year: getDefaultYear(),
  })
}

// The date filters default to a window ending today, so a link that omits them
// means "the last N days" to whoever opens it rather than the range the sender
// saw. Stamping the dates at build time keeps a copied link exact.
export function buildCollectionSummaryPath(
  path: string,
  getDefaultFrom: () => Date = getDefaultCollectionFromDate,
): string {
  return serializeDateRange(path, {
    from: getDefaultFrom(),
    to: getToday(),
  })
}

export function buildDepartedSearchPath(
  warehouse: Warehouse | null,
  assetType: AssetType | null,
): string {
  return serializeDepartedSearch(DEPARTED_PATH, {
    wh: warehouse ? [warehouse.id] : null,
    type: assetType ? [assetType.id] : null,
    from: getDefaultFromDate(DEFAULT_DEPARTED_RANGE_DAYS),
    to: getToday(),
  })
}

export function buildAssetSearchPath(
  path: string,
  warehouse: Warehouse | null,
  assetType: AssetType | null,
): string {
  return serializeAssetSearch(path, {
    wh: warehouse ? [warehouse.id] : null,
    type: assetType ? [assetType.id] : null,
  })
}
