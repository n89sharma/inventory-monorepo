import type { ModelSummary, Status, Warehouse } from 'shared-types'

const PARAM_MODEL = 'model'
const PARAM_METER = 'meter'
const PARAM_TRACK = 'track'
const PARAM_AVAIL = 'avail'
const PARAM_TECH = 'tech'
const PARAM_WH = 'wh'

export type SearchFilters = {
  model: ModelSummary | null
  meter: number | null
  trackingStatuses: Status[]
  availabilityStatuses: Status[]
  technicalStatuses: Status[]
  selectedWarehouses: Warehouse[]
}

export type SearchReferenceData = {
  models: ModelSummary[]
  trackingStatuses: Status[]
  availabilityStatuses: Status[]
  technicalStatuses: Status[]
  warehouses: Warehouse[]
}

export const EMPTY_FILTERS: SearchFilters = {
  model: null,
  meter: null,
  trackingStatuses: [],
  availabilityStatuses: [],
  technicalStatuses: [],
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
  if (filters.model) params.set(PARAM_MODEL, String(filters.model.id))
  if (filters.meter !== null) params.set(PARAM_METER, String(filters.meter))
  if (filters.trackingStatuses.length > 0) {
    params.set(PARAM_TRACK, encodeIds(filters.trackingStatuses))
  }
  if (filters.availabilityStatuses.length > 0) {
    params.set(PARAM_AVAIL, encodeIds(filters.availabilityStatuses))
  }
  if (filters.technicalStatuses.length > 0) {
    params.set(PARAM_TECH, encodeIds(filters.technicalStatuses))
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
  const meterRaw = params.get(PARAM_METER)
  const meter = meterRaw === null ? null : Number.parseFloat(meterRaw)

  return {
    model: modelId
      ? ref.models.find(m => m.id === Number.parseInt(modelId, 10)) ?? null
      : null,
    meter: meter === null || Number.isNaN(meter) ? null : meter,
    trackingStatuses: decodeIds(params.get(PARAM_TRACK), ref.trackingStatuses),
    availabilityStatuses: decodeIds(params.get(PARAM_AVAIL), ref.availabilityStatuses),
    technicalStatuses: decodeIds(params.get(PARAM_TECH), ref.technicalStatuses),
    selectedWarehouses: decodeIds(params.get(PARAM_WH), ref.warehouses),
  }
}

export function hasModelParam(params: URLSearchParams): boolean {
  return params.has(PARAM_MODEL)
}
