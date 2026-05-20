import type { ModelSummary, Status, Warehouse } from 'shared-types'

const PARAM_MODEL = 'model'
const PARAM_Q = 'q'
const PARAM_METER = 'meter'
const PARAM_AVAIL = 'avail'
const PARAM_TECH = 'tech'
const PARAM_WH = 'wh'

export const MIN_QUERY_LENGTH = 3

export type SearchFilters = {
  model: ModelSummary | null
  modelQuery: string | null
  meter: number | null
  availabilityStatuses: Status[]
  readinesses: Status[]
  selectedWarehouses: Warehouse[]
}

export type SearchReferenceData = {
  models: ModelSummary[]
  availabilityStatuses: Status[]
  readinesses: Status[]
  warehouses: Warehouse[]
}

export const EMPTY_FILTERS: SearchFilters = {
  model: null,
  modelQuery: null,
  meter: null,
  availabilityStatuses: [],
  readinesses: [],
  selectedWarehouses: [],
}

function encodeIds(items: { id: number }[]): string {
  return items.map(i => i.id).join(',')
}

function decodeIds<T extends { id: number }>(raw: string | null, lookup: T[]): T[] {
  if (!raw) return []
  const byId = new Map(lookup.map(item => [item.id, item]))
  return raw
    .split(',')
    .map(s => Number.parseInt(s, 10))
    .map(id => byId.get(id))
    .filter((item): item is T => item !== undefined)
}

export function filtersToParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.model) {
    params.set(PARAM_MODEL, String(filters.model.id))
  } else if (filters.modelQuery && filters.modelQuery.length >= MIN_QUERY_LENGTH) {
    params.set(PARAM_Q, filters.modelQuery)
  }
  if (filters.meter !== null) params.set(PARAM_METER, String(filters.meter))
  if (filters.availabilityStatuses.length > 0) {
    params.set(PARAM_AVAIL, encodeIds(filters.availabilityStatuses))
  }
  if (filters.readinesses.length > 0) {
    params.set(PARAM_TECH, encodeIds(filters.readinesses))
  }
  if (filters.selectedWarehouses.length > 0) {
    params.set(PARAM_WH, encodeIds(filters.selectedWarehouses))
  }
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchReferenceData,
): SearchFilters {
  const modelId = params.get(PARAM_MODEL)
  const model = modelId
    ? ref.models.find(m => m.id === Number.parseInt(modelId, 10)) ?? null
    : null

  const qRaw = params.get(PARAM_Q)
  const modelQuery = !model && qRaw && qRaw.length >= MIN_QUERY_LENGTH ? qRaw : null

  const meterRaw = params.get(PARAM_METER)
  const meter = meterRaw === null ? null : Number.parseFloat(meterRaw)

  return {
    model,
    modelQuery,
    meter: meter === null || Number.isNaN(meter) ? null : meter,
    availabilityStatuses: decodeIds(params.get(PARAM_AVAIL), ref.availabilityStatuses),
    readinesses: decodeIds(params.get(PARAM_TECH), ref.readinesses),
    selectedWarehouses: decodeIds(params.get(PARAM_WH), ref.warehouses),
  }
}
