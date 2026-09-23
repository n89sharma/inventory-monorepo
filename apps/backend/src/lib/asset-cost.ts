import type { AssetCost } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { decimalToNumber } from './decimal.js'

export const COST_SELECT = {
  purchase_cost: true,
  transport_cost: true,
  transfer_cost: true,
  processing_cost: true,
  other_cost: true,
  parts_cost: true,
  total_cost: true,
  sale_price: true,
} as const

export type CostRow = Record<keyof AssetCost, Prisma.Decimal | null>

export function toAssetCost(row: CostRow | null): AssetCost {
  return {
    purchase_cost: decimalToNumber(row?.purchase_cost ?? null),
    transport_cost: decimalToNumber(row?.transport_cost ?? null),
    transfer_cost: decimalToNumber(row?.transfer_cost ?? null),
    processing_cost: decimalToNumber(row?.processing_cost ?? null),
    other_cost: decimalToNumber(row?.other_cost ?? null),
    parts_cost: decimalToNumber(row?.parts_cost ?? null),
    total_cost: decimalToNumber(row?.total_cost ?? null),
    sale_price: decimalToNumber(row?.sale_price ?? null),
  }
}
