import { getModels, previewModelMerge } from '@/data/api/model-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { ModelMergePreview, ModelSummary } from 'shared-types'
import useSWR, { mutate } from 'swr'

const MODELS_KEY = 'models'
const MODEL_MERGE_PREVIEW_KEY = 'model-merge-preview'
const EMPTY_MODELS: ModelSummary[] = []

export function useModels(): ModelSummary[] {
  const { data } = useSWR(MODELS_KEY, getModels, CATALOG_DATA_OPTIONS)
  return data ?? EMPTY_MODELS
}

export function invalidateModels() {
  return mutate(MODELS_KEY)
}

// Which row wins the merge, and how many assets each one carries. Keyed by the ids so changing
// the selection refetches; null until a merge is possible.
export function useModelMergePreview(ids: number[]): ModelMergePreview | undefined {
  const sortedIds = [...ids].sort((a, b) => a - b)
  const { data } = useSWR(
    sortedIds.length > 1 ? [MODEL_MERGE_PREVIEW_KEY, ...sortedIds] : null,
    () => previewModelMerge(sortedIds),
  )
  return data
}
