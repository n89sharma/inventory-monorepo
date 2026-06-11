import type { Component, ModelSummary, Status, Warehouse } from 'shared-types'
import {
  decodeIds,
  encodeIds,
  getModelParams,
  parseNonNegativeNumber,
  setModelParams,
} from '@/lib/asset-filter-params'

const PARAM_METER_MIN = 'meter_min'
const PARAM_METER_MAX = 'meter_max'
const PARAM_STATUS = 'status'
const PARAM_READINESS = 'readiness'
const PARAM_WH = 'wh'
const PARAM_CAS = 'cas'
const PARAM_FIN = 'fin'

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

export function filtersToParams(filters: SearchAllFilters): URLSearchParams {
  const params = new URLSearchParams()
  setModelParams(params, filters.model, filters.modelQuery)
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
  const { model, modelQuery } = getModelParams(params, ref.models)

  const cassettesRaw = params.get(PARAM_CAS)
  const cassettes = cassettesRaw === null ? null : Number.parseInt(cassettesRaw, 10)

  const finisherRaw = params.get(PARAM_FIN)
  const internalFinisher = finisherRaw
    ? ref.components.find(c => c.id === Number.parseInt(finisherRaw, 10)) ?? null
    : null

  return {
    model,
    modelQuery,
    meterMin: parseNonNegativeNumber(params.get(PARAM_METER_MIN)),
    meterMax: parseNonNegativeNumber(params.get(PARAM_METER_MAX)),
    cassettes: cassettes === null || Number.isNaN(cassettes) || cassettes < 0 ? null : cassettes,
    internalFinisher,
    statuses: decodeIds(params.get(PARAM_STATUS), ref.statuses),
    readinesses: decodeIds(params.get(PARAM_READINESS), ref.readinesses),
    selectedWarehouses: decodeIds(params.get(PARAM_WH), ref.warehouses),
  }
}
