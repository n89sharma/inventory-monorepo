import { getWarehouseTransferCosts } from '@/data/api/transfer-cost-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { TransferCosts, WarehouseTransferCost } from 'shared-types'
import useSWR, { mutate } from 'swr'

const TRANSFER_COSTS_KEY = 'transfer-costs'
const ZERO_COSTS = { transfer_cost: 0, processing_cost: 0, other_cost: 0 } as const

export function useWarehouseTransferCosts(): WarehouseTransferCost[] | undefined {
  const { data } = useSWR(TRANSFER_COSTS_KEY, getWarehouseTransferCosts, CATALOG_DATA_OPTIONS)
  return data
}

// A warehouse with no saved row costs nothing, which is what the backend applies too.
export function warehouseCostsOf(
  costs: WarehouseTransferCost[] | undefined,
  warehouseId: number,
): TransferCosts {
  const saved = costs?.find((c) => c.warehouse_id === warehouseId)
  if (!saved) return ZERO_COSTS
  return {
    transfer_cost: saved.transfer_cost,
    processing_cost: saved.processing_cost,
    other_cost: saved.other_cost,
  }
}

export function invalidateWarehouseTransferCosts() {
  return mutate(TRANSFER_COSTS_KEY)
}
