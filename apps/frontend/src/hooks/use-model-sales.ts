import { getModelSales } from '@/data/api/model-sales-api'
import type { ModelSalesResult } from 'shared-types'
import useSWR from 'swr'

const MODEL_SALES_KEY = 'model-sales'

export function useModelSales(modelId: number | null) {
  return useSWR<ModelSalesResult>(
    modelId !== null ? [MODEL_SALES_KEY, modelId] : null,
    ([, id]: [string, number]) => getModelSales(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
