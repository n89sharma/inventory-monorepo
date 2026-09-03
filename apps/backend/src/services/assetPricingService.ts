import {
  AssetCost,
  BulkUpdateAssetPricing,
  PatchAssetPricing,
  totalCostFromComponents,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { decimalToNumber } from '../lib/decimal.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

const COST_SELECT = {
  purchase_cost: true,
  transport_cost: true,
  processing_cost: true,
  other_cost: true,
  parts_cost: true,
  total_cost: true,
  sale_price: true,
} as const

type CostRow = Record<keyof AssetCost, Prisma.Decimal | null>

function toAssetCost(row: CostRow | null): AssetCost {
  return {
    purchase_cost: decimalToNumber(row?.purchase_cost ?? null),
    transport_cost: decimalToNumber(row?.transport_cost ?? null),
    processing_cost: decimalToNumber(row?.processing_cost ?? null),
    other_cost: decimalToNumber(row?.other_cost ?? null),
    parts_cost: decimalToNumber(row?.parts_cost ?? null),
    total_cost: decimalToNumber(row?.total_cost ?? null),
    sale_price: decimalToNumber(row?.sale_price ?? null),
  }
}

// A field the patch omits keeps its current value, null included; only the total is
// derived, and it reads a missing component as zero.
function mergePricing(current: AssetCost, patch: PatchAssetPricing): AssetCost {
  const merged = {
    purchase_cost: patch.purchase_cost ?? current.purchase_cost,
    transport_cost: patch.transport_cost ?? current.transport_cost,
    processing_cost: patch.processing_cost ?? current.processing_cost,
    other_cost: patch.other_cost ?? current.other_cost,
    parts_cost: patch.parts_cost ?? current.parts_cost,
    sale_price: patch.sale_price ?? current.sale_price,
  }
  return { ...merged, total_cost: totalCostFromComponents(merged) }
}

export async function patchAssetPricing(
  barcode: string,
  patch: PatchAssetPricing,
  userId: number,
): Promise<AssetCost> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const currentCost = toAssetCost(
    await prisma.cost.findUnique({ where: { asset_id: asset.id }, select: COST_SELECT }),
  )
  const newCost = mergePricing(currentCost, patch)

  await prisma.cost.upsert({
    where: { asset_id: asset.id },
    update: newCost,
    create: { asset_id: asset.id, ...newCost },
  })

  await recordAssetUpdate(asset.id, currentCost, newCost, userId)

  return newCost
}

export async function bulkUpdateAssetPricing(
  items: BulkUpdateAssetPricing['items'],
  userId: number,
): Promise<void> {
  const assets = await prisma.asset.findMany({
    where: { barcode: { in: items.map((i) => i.barcode) } },
    select: { id: true, barcode: true },
  })
  if (assets.length !== items.length) {
    const found = new Set(assets.map((a) => a.barcode))
    const missing = items.map((i) => i.barcode).filter((b) => !found.has(b))
    throw new NotFoundError(`Assets not found: ${missing.join(', ')}`)
  }
  const assetMap = new Map(assets.map((a) => [a.barcode, a.id]))

  const currentCosts = await prisma.cost.findMany({
    where: { asset_id: { in: assets.map((a) => a.id) } },
    select: { asset_id: true, ...COST_SELECT },
  })
  const costMap = new Map(currentCosts.map((c) => [c.asset_id, toAssetCost(c)]))

  const changes = items.map((item) => {
    const assetId = assetMap.get(item.barcode)!
    const currentCost = costMap.get(assetId) ?? toAssetCost(null)
    return { assetId, currentCost, newCost: mergePricing(currentCost, item) }
  })

  await prisma.$transaction(async (tx) => {
    for (const { assetId, newCost } of changes) {
      await tx.cost.upsert({
        where: { asset_id: assetId },
        update: newCost,
        create: { asset_id: assetId, ...newCost },
      })
    }
  })

  await Promise.all(
    changes.map(({ assetId, currentCost, newCost }) =>
      recordAssetUpdate(assetId, currentCost, newCost, userId),
    ),
  )
}
