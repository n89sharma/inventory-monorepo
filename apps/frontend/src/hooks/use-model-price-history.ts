import { getModelPriceHistory } from '@/data/api/model-price-history-api'
import type { ModelPriceHistoryResult } from 'shared-types'
import useSWR from 'swr'

const MODEL_PRICE_HISTORY_KEY = 'model-price-history'

export function useModelPriceHistory(modelId: number | null) {
  return useSWR<ModelPriceHistoryResult>(
    modelId !== null ? [MODEL_PRICE_HISTORY_KEY, modelId] : null,
    ([, id]: [string, number]) => getModelPriceHistory(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
