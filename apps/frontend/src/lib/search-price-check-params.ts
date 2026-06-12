import { getModelParams, setModelParams } from '@/lib/asset-filter-params'
import type { ModelSummary } from 'shared-types'

const PARAM_RANGE = 'range'
const PARAM_SPECS = 'specs'
const RANGE_12 = '12'
const SPECS_ON = '1'

export type PriceCheckRange = 6 | 12

export const DEFAULT_RANGE: PriceCheckRange = 6

export type PriceCheckFilters = {
  model: ModelSummary | null
  range: PriceCheckRange
  specsVisible: boolean
}

export function filtersToParams(filters: PriceCheckFilters): URLSearchParams {
  const params = new URLSearchParams()
  setModelParams(params, filters.model, null)
  if (filters.range === 12) params.set(PARAM_RANGE, RANGE_12)
  if (filters.specsVisible) params.set(PARAM_SPECS, SPECS_ON)
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  models: ModelSummary[],
): PriceCheckFilters {
  return {
    model: getModelParams(params, models).model,
    range: params.get(PARAM_RANGE) === RANGE_12 ? 12 : DEFAULT_RANGE,
    specsVisible: params.get(PARAM_SPECS) === SPECS_ON,
  }
}
