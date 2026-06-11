import type { Component, ModelSummary, Status, Warehouse } from 'shared-types'

const PARAM_MODEL = 'model'
const PARAM_Q = 'q'
const PARAM_METER_MIN = 'meter_min'
const PARAM_METER_MAX = 'meter_max'
const PARAM_STATUS = 'status'
const PARAM_READINESS = 'readiness'
const PARAM_WH = 'wh'
const PARAM_CAS = 'cas'
const PARAM_FIN = 'fin'

export const MIN_MODEL_INPUT_QUERY_LENGTH = 4

export type SearchAllFilters = {
  model: ModelSummary | null
  modelQuery: string | null
  meterMin: number | null
  meterMax: number | null
  cassettes: number | null
  internalFinisher: Component | null
  statuses: Status[]
  readinesses: Status[]
  selectedWarehouses: Warehouse[]
}

export type SearchAllReferenceData = {
  models: ModelSummary[]
  statuses: Status[]
  readinesses: Status[]
  warehouses: Warehouse[]
  components: Component[]
}

export const EMPTY_SEARCH_ALL_FILTERS: SearchAllFilters = {
  model: null,
  modelQuery: null,
  meterMin: null,
  meterMax: null,
  cassettes: null,
  internalFinisher: null,
  statuses: [],
  readinesses: [],
  selectedWarehouses: [],
}

function parseNonNegativeNumber(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseFloat(raw)
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed
}

export function encodeIds(items: { id: number }[]): string {
  return items.map(i => i.id).join(',')
}

export function decodeIds<T extends { id: number }>(raw: string | null, lookup: T[]): T[] {
  if (!raw) return []
  const byId = new Map(lookup.map(item => [item.id, item]))
  return raw
    .split(',')
    .map(s => Number.parseInt(s, 10))
    .map(id => byId.get(id))
    .filter((item): item is T => item !== undefined)
}

export function filtersToParams(filters: SearchAllFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.model) {
    params.set(PARAM_MODEL, String(filters.model.id))
  } else if (filters.modelQuery && filters.modelQuery.length >= MIN_MODEL_INPUT_QUERY_LENGTH) {
    params.set(PARAM_Q, filters.modelQuery)
  }
  if (filters.meterMin !== null) params.set(PARAM_METER_MIN, String(filters.meterMin))
  if (filters.meterMax !== null) params.set(PARAM_METER_MAX, String(filters.meterMax))
  if (filters.cassettes !== null) params.set(PARAM_CAS, String(filters.cassettes))
  if (filters.internalFinisher) {
    params.set(PARAM_FIN, String(filters.internalFinisher.id))
  }
  if (filters.statuses.length > 0) {
    params.set(PARAM_STATUS, encodeIds(filters.statuses))
  }
  if (filters.readinesses.length > 0) {
    params.set(PARAM_READINESS, encodeIds(filters.readinesses))
  }
  if (filters.selectedWarehouses.length > 0) {
    params.set(PARAM_WH, encodeIds(filters.selectedWarehouses))
  }
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchAllReferenceData,
): SearchAllFilters {
  const modelId = params.get(PARAM_MODEL)
  const model = modelId
    ? ref.models.find(m => m.id === Number.parseInt(modelId, 10)) ?? null
    : null

  const qRaw = params.get(PARAM_Q)
  const modelQuery = !model && qRaw && qRaw.length >= MIN_MODEL_INPUT_QUERY_LENGTH ? qRaw : null

  const meterMin = parseNonNegativeNumber(params.get(PARAM_METER_MIN))
  const meterMax = parseNonNegativeNumber(params.get(PARAM_METER_MAX))

  const cassettesRaw = params.get(PARAM_CAS)
  const cassettes = cassettesRaw === null ? null : Number.parseInt(cassettesRaw, 10)

  const finisherRaw = params.get(PARAM_FIN)
  const internalFinisher = finisherRaw
    ? ref.components.find(c => c.id === Number.parseInt(finisherRaw, 10)) ?? null
    : null

  return {
    model,
    modelQuery,
    meterMin,
    meterMax,
    cassettes: cassettes === null || Number.isNaN(cassettes) || cassettes < 0 ? null : cassettes,
    internalFinisher,
    statuses: decodeIds(params.get(PARAM_STATUS), ref.statuses),
    readinesses: decodeIds(params.get(PARAM_READINESS), ref.readinesses),
    selectedWarehouses: decodeIds(params.get(PARAM_WH), ref.warehouses),
  }
}
