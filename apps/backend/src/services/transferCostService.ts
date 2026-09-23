import type { TransferCosts, WarehouseTransferCost } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { ZERO, decimalToNumber } from '../lib/decimal.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const TRANSFER_COST_SELECT = {
  warehouse_id: true,
  transfer_cost: true,
  processing_cost: true,
  tested_processing_cost: true,
  other_cost: true,
} as const

export type TransferCostDecimals = {
  transfer_cost: Prisma.Decimal
  processing_cost: Prisma.Decimal
  tested_processing_cost: Prisma.Decimal
  other_cost: Prisma.Decimal
}

export async function getWarehouseTransferCosts(): Promise<WarehouseTransferCost[]> {
  const rows = await prisma.warehouseTransferCost.findMany({ select: TRANSFER_COST_SELECT })
  return rows.map((row) => ({
    warehouse_id: row.warehouse_id,
    transfer_cost: decimalToNumber(row.transfer_cost) ?? 0,
    processing_cost: decimalToNumber(row.processing_cost) ?? 0,
    tested_processing_cost: decimalToNumber(row.tested_processing_cost) ?? 0,
    other_cost: decimalToNumber(row.other_cost) ?? 0,
  }))
}

export async function updateWarehouseTransferCost(
  warehouseId: number,
  costs: TransferCosts,
  userId: number,
): Promise<void> {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true },
  })
  if (!warehouse) throw new NotFoundError(`Warehouse ${warehouseId} not found`)

  const data = { ...costs, updated_by_id: userId, updated_at: new Date() }
  await prisma.warehouseTransferCost.upsert({
    where: { warehouse_id: warehouseId },
    update: data,
    create: { warehouse_id: warehouseId, ...data },
  })
}

// A warehouse with no saved row costs nothing, so dispatch never blocks on missing setup.
export async function getWarehouseTransferCostDecimals(
  tx: Prisma.TransactionClient,
  warehouseId: number,
): Promise<TransferCostDecimals> {
  const row = await tx.warehouseTransferCost.findUnique({
    where: { warehouse_id: warehouseId },
    select: {
      transfer_cost: true,
      processing_cost: true,
      tested_processing_cost: true,
      other_cost: true,
    },
  })
  if (!row) {
    return {
      transfer_cost: ZERO,
      processing_cost: ZERO,
      tested_processing_cost: ZERO,
      other_cost: ZERO,
    }
  }
  return row
}
