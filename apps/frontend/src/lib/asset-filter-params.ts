import type { ModelSummary } from 'shared-types'

export const MIN_MODEL_INPUT_QUERY_LENGTH = 4

const PARAM_MODEL = 'model'
const PARAM_Q = 'q'

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
