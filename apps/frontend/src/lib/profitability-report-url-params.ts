const PARAM_YEAR = 'year'
const PARAM_WAREHOUSE = 'wh'
const PARAM_SALESPERSON = 'sp'
const PARAM_VENDOR = 'vendor'
const PARAM_BRAND = 'brand'

const LIST_SEPARATOR = ','

export type ProfitabilityFilters = {
  year: number
  warehouseIds: number[]
  salesRepId: number | null
  vendorId: number | null
  brandId: number | null
}

function parseNumberOrNull(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseNumberList(raw: string | null): number[] {
  if (raw === null) return []
  return raw
    .split(LIST_SEPARATOR)
    .map(part => Number.parseInt(part, 10))
    .filter(value => !Number.isNaN(value))
}

export function filtersToParams(filters: ProfitabilityFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set(PARAM_YEAR, String(filters.year))
  if (filters.warehouseIds.length > 0) {
    params.set(PARAM_WAREHOUSE, filters.warehouseIds.join(LIST_SEPARATOR))
  }
  if (filters.salesRepId !== null) params.set(PARAM_SALESPERSON, String(filters.salesRepId))
  if (filters.vendorId !== null) params.set(PARAM_VENDOR, String(filters.vendorId))
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
    warehouseIds: parseNumberList(params.get(PARAM_WAREHOUSE)),
    salesRepId: parseNumberOrNull(params.get(PARAM_SALESPERSON)),
    vendorId: parseNumberOrNull(params.get(PARAM_VENDOR)),
    brandId: parseNumberOrNull(params.get(PARAM_BRAND)),
  }
}
