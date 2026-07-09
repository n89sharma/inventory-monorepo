import { recordStoreTransaction as recordStoreTransactionApi } from '@/data/api/store-part-api'
import { invalidateStorePartLists, storePartDetailKey } from '@/hooks/use-store-part'
import type { StoreTransactionForm } from '@/ui-types/store-part-form-types'
import type { StoreTransactionResponse } from 'shared-types'
import { mutate } from 'swr'

async function recordStoreTransaction(
  warehouseId: number,
  form: StoreTransactionForm,
): Promise<StoreTransactionResponse> {
  const result = await recordStoreTransactionApi(warehouseId, form)
  invalidateStorePartLists()
  mutate(storePartDetailKey(result.store_part_id))
  return result
}

const mutations = {
  recordStoreTransaction,
} as const

export function useStorePartMutations() {
  return mutations
}
