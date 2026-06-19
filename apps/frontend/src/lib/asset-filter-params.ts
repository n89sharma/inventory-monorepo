import type { Component, ModelSummary, Status, Warehouse } from 'shared-types'

export const MIN_MODEL_INPUT_QUERY_LENGTH = 4

const PARAM_MODEL = 'model'
const PARAM_Q = 'q'
const PARAM_WH = 'wh'
const PARAM_READINESS = 'readiness'
const PARAM_METER_MIN = 'meter_min'
const PARAM_METER_MAX = 'meter_max'
const PARAM_CAS = 'cas'
const PARAM_FIN = 'fin'

export type SharedAssetFilters = {
  warehouses: Warehouse[]
  model: ModelSummary | null
  modelQuery: string | null
  readinesses: Status[]
  meterMin: number | null
  meterMax: number | null
  cassettes: number | null
  internalFinisher: Component | null
}

export type SharedAssetReferenceData = {
  warehouses: Warehouse[]
  models: ModelSummary[]
  readinesses: Status[]
  components: Component[]
}

export const EMPTY_SHARED_FILTERS: SharedAssetFilters = {
  warehouses: [],
  model: null,
  modelQuery: null,
  readinesses: [],
  meterMin: null,
  meterMax: null,
  cassettes: null,
  internalFinisher: null,
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

export function parseNonNegativeNumber(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseFloat(raw)
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed
}

export function setModelParams(
  params: URLSearchParams,
  model: ModelSummary | null,
  modelQuery: string | null,
): void {
  if (model) {
    params.set(PARAM_MODEL, String(model.id))
  } else if (modelQuery && modelQuery.length >= MIN_MODEL_INPUT_QUERY_LENGTH) {
    params.set(PARAM_Q, modelQuery)
  }
}

export function getModelParams(
  params: URLSearchParams,
  models: ModelSummary[],
): { model: ModelSummary | null; modelQuery: string | null } {
  const modelId = params.get(PARAM_MODEL)
  const model = modelId
    ? models.find(m => m.id === Number.parseInt(modelId, 10)) ?? null
    : null
  const qRaw = params.get(PARAM_Q)
  const modelQuery = !model && qRaw && qRaw.length >= MIN_MODEL_INPUT_QUERY_LENGTH ? qRaw : null
  return { model, modelQuery }
}

export function setSharedFilterParams(
  params: URLSearchParams,
  filters: SharedAssetFilters,
): void {
  if (filters.warehouses.length > 0) params.set(PARAM_WH, encodeIds(filters.warehouses))
  setModelParams(params, filters.model, filters.modelQuery)
  if (filters.readinesses.length > 0) params.set(PARAM_READINESS, encodeIds(filters.readinesses))
  if (filters.meterMin !== null) params.set(PARAM_METER_MIN, String(filters.meterMin))
  if (filters.meterMax !== null) params.set(PARAM_METER_MAX, String(filters.meterMax))
  if (filters.cassettes !== null) params.set(PARAM_CAS, String(filters.cassettes))
  if (filters.internalFinisher) params.set(PARAM_FIN, String(filters.internalFinisher.id))
}

export function resolveWarehouseScope(
  selected: Warehouse[],
  activeWarehouses: Warehouse[],
): Warehouse[] {
  return selected.length > 0 ? selected : activeWarehouses
}

export function buildAssetSearchPath(path: string, warehouse: Warehouse | null): string {
  if (!warehouse) return path
  const params = new URLSearchParams()
  params.set(PARAM_WH, String(warehouse.id))
  return `${path}?${params}`
}

export function getSharedFilters(
  params: URLSearchParams,
  ref: SharedAssetReferenceData,
): SharedAssetFilters {
  const warehouses = decodeIds(params.get(PARAM_WH), ref.warehouses)

  const { model, modelQuery } = getModelParams(params, ref.models)

  const finisherRaw = params.get(PARAM_FIN)
  const internalFinisher = finisherRaw
    ? ref.components.find(c => c.id === Number.parseInt(finisherRaw, 10)) ?? null
    : null

  const cassettesRaw = params.get(PARAM_CAS)
  const cassettes = cassettesRaw === null ? null : Number.parseInt(cassettesRaw, 10)

  return {
    warehouses,
    model,
    modelQuery,
    readinesses: decodeIds(params.get(PARAM_READINESS), ref.readinesses),
    meterMin: parseNonNegativeNumber(params.get(PARAM_METER_MIN)),
    meterMax: parseNonNegativeNumber(params.get(PARAM_METER_MAX)),
    cassettes: cassettes === null || Number.isNaN(cassettes) || cassettes < 0 ? null : cassettes,
    internalFinisher,
  }
}
