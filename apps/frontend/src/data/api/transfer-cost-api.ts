import { api } from '@/data/api/axios-client'
import {
  type TransferCosts,
  TransferCostsSchema,
  type WarehouseTransferCost,
  WarehouseTransferCostSchema,
} from 'shared-types'
import { z } from 'zod'

const WarehouseTransferCostsSchema = z.array(WarehouseTransferCostSchema)

export async function getWarehouseTransferCosts(): Promise<WarehouseTransferCost[]> {
  const { data } = await api.get<WarehouseTransferCost[]>('/transfer-costs')
  return WarehouseTransferCostsSchema.parse(data)
}

export async function updateWarehouseTransferCost(
  warehouseId: number,
  costs: TransferCosts,
): Promise<void> {
  const updateWarehouseTransferCostBody = TransferCostsSchema.parse(costs satisfies TransferCosts)
  await api.put(`/transfer-costs/${warehouseId}`, updateWarehouseTransferCostBody)
}
