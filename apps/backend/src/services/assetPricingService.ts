import { BulkUpdateAssetPricing, UpdateAssetPricing } from 'shared-types'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

export async function updateAssetPricing(
  barcode: string,
  data: UpdateAssetPricing,
  userId: number
): Promise<void> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const currentCost = await prisma.cost.findUnique({
    where: { asset_id: asset.id },
    select: {
      purchase_cost: true, transport_cost: true, processing_cost: true,
      other_cost: true, parts_cost: true, total_cost: true, sale_price: true
    }
  })

  const total_cost = data.purchase_cost + data.transport_cost + data.processing_cost
    + data.other_cost + data.parts_cost

  await prisma.cost.upsert({
    where: { asset_id: asset.id },
    update: {
      purchase_cost: data.purchase_cost, transport_cost: data.transport_cost,
      processing_cost: data.processing_cost, other_cost: data.other_cost,
      parts_cost: data.parts_cost, total_cost, sale_price: data.sale_price
    },
    create: {
      asset_id: asset.id, purchase_cost: data.purchase_cost,
      transport_cost: data.transport_cost, processing_cost: data.processing_cost,
      other_cost: data.other_cost, parts_cost: data.parts_cost,
      total_cost, sale_price: data.sale_price
    },
  })

  await recordAssetUpdate(asset.id, {
    purchase_cost: currentCost?.purchase_cost?.toNumber() ?? null,
    transport_cost: currentCost?.transport_cost?.toNumber() ?? null,
    processing_cost: currentCost?.processing_cost?.toNumber() ?? null,
    other_cost: currentCost?.other_cost?.toNumber() ?? null,
    parts_cost: currentCost?.parts_cost?.toNumber() ?? null,
    total_cost: currentCost?.total_cost?.toNumber() ?? null,
    sale_price: currentCost?.sale_price?.toNumber() ?? null
  }, {
    purchase_cost: data.purchase_cost, transport_cost: data.transport_cost,
    processing_cost: data.processing_cost, other_cost: data.other_cost,
    parts_cost: data.parts_cost, total_cost, sale_price: data.sale_price
  }, userId)
}

export async function bulkUpdateAssetPricing(
  items: BulkUpdateAssetPricing['items'],
  userId: number
): Promise<void> {
  const assets = await prisma.asset.findMany({
    where: { barcode: { in: items.map(i => i.barcode) } },
    select: { id: true, barcode: true }
  })
  if (assets.length !== items.length) {
    const found = new Set(assets.map(a => a.barcode))
    const missing = items.map(i => i.barcode).filter(b => !found.has(b))
    throw new NotFoundError(`Assets not found: ${missing.join(', ')}`)
  }
  const assetMap = new Map(assets.map(a => [a.barcode, a.id]))

  const currentCosts = await prisma.cost.findMany({
    where: { asset_id: { in: assets.map(a => a.id) } },
    select: {
      asset_id: true, purchase_cost: true, transport_cost: true,
      processing_cost: true, other_cost: true, parts_cost: true,
      total_cost: true, sale_price: true
    }
  })
  const costMap = new Map(currentCosts.map(c => [c.asset_id, c]))

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const assetId = assetMap.get(item.barcode)!
      const total_cost = item.purchase_cost + item.transport_cost + item.processing_cost
        + item.other_cost + item.parts_cost
      await tx.cost.upsert({
        where: { asset_id: assetId },
        update: {
          purchase_cost: item.purchase_cost, transport_cost: item.transport_cost,
          processing_cost: item.processing_cost, other_cost: item.other_cost,
          parts_cost: item.parts_cost, total_cost, sale_price: item.sale_price
        },
        create: {
          asset_id: assetId, purchase_cost: item.purchase_cost,
          transport_cost: item.transport_cost, processing_cost: item.processing_cost,
          other_cost: item.other_cost, parts_cost: item.parts_cost,
          total_cost, sale_price: item.sale_price
        }
      })
    }
  })

  await Promise.all(items.map(item => {
    const assetId = assetMap.get(item.barcode)!
    const currentCost = costMap.get(assetId)
    const total_cost = item.purchase_cost + item.transport_cost + item.processing_cost
      + item.other_cost + item.parts_cost
    return recordAssetUpdate(assetId, {
      purchase_cost: currentCost?.purchase_cost?.toNumber() ?? null,
      transport_cost: currentCost?.transport_cost?.toNumber() ?? null,
      processing_cost: currentCost?.processing_cost?.toNumber() ?? null,
      other_cost: currentCost?.other_cost?.toNumber() ?? null,
      parts_cost: currentCost?.parts_cost?.toNumber() ?? null,
      total_cost: currentCost?.total_cost?.toNumber() ?? null,
      sale_price: currentCost?.sale_price?.toNumber() ?? null
    }, {
      purchase_cost: item.purchase_cost, transport_cost: item.transport_cost,
      processing_cost: item.processing_cost, other_cost: item.other_cost,
      parts_cost: item.parts_cost, total_cost, sale_price: item.sale_price
    }, userId)
  }))
}
