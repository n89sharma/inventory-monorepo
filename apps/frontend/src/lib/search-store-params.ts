import type { Warehouse } from 'shared-types'

const PARAM_WAREHOUSE = 'warehouse'
const PARAM_SEARCH = 'search'
const STORE_LIST_PATH = '/store'

export type StoreFilters = {
  warehouses: Warehouse[]
  search: string
}

export const EMPTY_STORE_FILTERS: StoreFilters = {
  warehouses: [],
  search: ''
}

export function filtersToParams(filters: StoreFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.warehouses.length > 0) {
    params.set(PARAM_WAREHOUSE, filters.warehouses.map(w => w.id).join(','))
  }
  if (filters.search.trim()) {
    params.set(PARAM_SEARCH, filters.search.trim())
  }
  return params
}

export function buildStoreListPath(warehouse: Warehouse | null): string {
  if (!warehouse) return STORE_LIST_PATH
  const params = new URLSearchParams()
  params.set(PARAM_WAREHOUSE, String(warehouse.id))
  return `${STORE_LIST_PATH}?${params}`
}

export function paramsToFilters(
  params: URLSearchParams,
  warehouses: Warehouse[],
): StoreFilters {
  const raw = params.get(PARAM_WAREHOUSE)
  const search = params.get(PARAM_SEARCH) ?? ''
  if (raw === null) return { warehouses: [], search }
  const ids = new Set(
    raw
      .split(',')
      .map(Number)
      .filter(id => !Number.isNaN(id))
  )
  return {
    warehouses: warehouses.filter(w => ids.has(w.id)),
    search
  }
}
