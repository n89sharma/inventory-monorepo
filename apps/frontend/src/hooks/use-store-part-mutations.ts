import { addPurchase as addPurchaseApi } from '@/data/api/store-part-api'
import { invalidateStorePartLists, storePartDetailKey } from '@/hooks/use-store-part'
import type { AddPurchaseForm } from '@/ui-types/store-part-form-types'
import type { AddPurchaseResponse } from 'shared-types'
import { mutate } from 'swr'

async function addPurchase(
  warehouseId: number,
  form: AddPurchaseForm
): Promise<AddPurchaseResponse> {
  const result = await addPurchaseApi(warehouseId, form)
  invalidateStorePartLists()
  mutate(storePartDetailKey(result.part_number))
  return result
}

const mutations = {
  addPurchase
} as const

export function useStorePartMutations() {
  return mutations
}
