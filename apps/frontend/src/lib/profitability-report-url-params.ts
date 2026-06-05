const PARAM_YEAR = 'year'
const PARAM_WAREHOUSE = 'wh'
const PARAM_SALESPERSON = 'sp'
const PARAM_VENDOR = 'vendor'
const PARAM_BRAND = 'brand'

export const NONE_FILTER = 'none'

export type DimensionValue = number | typeof NONE_FILTER | null

export type ProfitabilityFilters = {
  year: number
  warehouseId: number | null
  salesRepId: DimensionValue
  vendorId: DimensionValue
  brandId: number | null
}

function parseDimension(raw: string | null): DimensionValue {
  if (raw === null) return null
  if (raw === NONE_FILTER) return NONE_FILTER
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseNumberOrNull(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function setDimension(
  params: URLSearchParams,
  key: string,
  value: DimensionValue,
): void {
  if (value === null) return
  params.set(key, value === NONE_FILTER ? NONE_FILTER : String(value))
}

export function filtersToParams(filters: ProfitabilityFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set(PARAM_YEAR, String(filters.year))
  if (filters.warehouseId !== null) params.set(PARAM_WAREHOUSE, String(filters.warehouseId))
  setDimension(params, PARAM_SALESPERSON, filters.salesRepId)
  setDimension(params, PARAM_VENDOR, filters.vendorId)
  if (filters.brandId !== null) params.set(PARAM_BRAND, String(filters.brandId))
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  defaultYear: number,
): ProfitabilityFilters {
  const yearRaw = Number.parseInt(params.get(PARAM_YEAR) ?? '', 10)
  return {
    year: Number.isNaN(yearRaw) ? defaultYear : yearRaw,
    warehouseId: parseNumberOrNull(params.get(PARAM_WAREHOUSE)),
    salesRepId: parseDimension(params.get(PARAM_SALESPERSON)),
    vendorId: parseDimension(params.get(PARAM_VENDOR)),
    brandId: parseNumberOrNull(params.get(PARAM_BRAND)),
  }
}
