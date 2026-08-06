import { getModels } from '@/data/api/model-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { ModelSummary } from 'shared-types'
import useSWR, { mutate } from 'swr'

const MODELS_KEY = 'models'
const EMPTY_MODELS: ModelSummary[] = []

export function useModels(): ModelSummary[] {
  const { data } = useSWR(MODELS_KEY, getModels, CATALOG_DATA_OPTIONS)
  return data ?? EMPTY_MODELS
}

export function invalidateModels() {
  return mutate(MODELS_KEY)
}
