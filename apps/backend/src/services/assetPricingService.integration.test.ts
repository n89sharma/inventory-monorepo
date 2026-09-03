import { BulkUpdateAssetPricing } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetCost,
  seedArrivalTestData,
} from '../../test/factories.js'
import { NotFoundError } from '../lib/errors.js'
import { bulkUpdateAssetPricing, patchAssetPricing } from './assetPricingService.js'

const FULL_PRICING = {
  purchase_cost: 100,
  transport_cost: 10,
  transfer_cost: 8,
  processing_cost: 5,
  other_cost: 2,
  parts_cost: 3,
  sale_price: 200,
}

describe('assetPricingService', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('computes total_cost as the sum of the six cost components', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await patchAssetPricing(asset.barcode, FULL_PRICING, refs.userId)

    const cost = await getAssetCost(asset.id)
    expect(cost?.total_cost).toBe(128)
    expect(cost?.purchase_cost).toBe(100)
    expect(cost?.sale_price).toBe(200)
  })

  it('leaves fields the patch omits untouched and recomputes the total', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await patchAssetPricing(asset.barcode, FULL_PRICING, refs.userId)

    const returned = await patchAssetPricing(asset.barcode, { purchase_cost: 150 }, refs.userId)

    expect(returned).toEqual({ ...FULL_PRICING, purchase_cost: 150, total_cost: 178 })
    const cost = await getAssetCost(asset.id)
    expect(cost?.purchase_cost).toBe(150)
    expect(cost?.transport_cost).toBe(10)
    expect(cost?.other_cost).toBe(2)
    expect(cost?.parts_cost).toBe(3)
    expect(cost?.sale_price).toBe(200)
    expect(cost?.total_cost).toBe(178)
  })

  it('creates the cost row when the asset has none, leaving unpatched fields null', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    const returned = await patchAssetPricing(asset.barcode, { sale_price: 75 }, refs.userId)

    expect(returned).toEqual({
      purchase_cost: null,
      transport_cost: null,
      transfer_cost: null,
      processing_cost: null,
      other_cost: null,
      parts_cost: null,
      total_cost: 0,
      sale_price: 75,
    })
    const cost = await getAssetCost(asset.id)
    expect(cost?.sale_price).toBe(75)
    expect(cost?.purchase_cost).toBeNull()
  })

  it('rejects a patch for a barcode that does not exist', async () => {
    await expect(
      patchAssetPricing('DOES-NOT-EXIST', { purchase_cost: 1 }, refs.userId),
    ).rejects.toThrow(NotFoundError)
  })

  it('keeps the fields a bulk item omits and recomputes the total', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await patchAssetPricing(asset.barcode, FULL_PRICING, refs.userId)

    await bulkUpdateAssetPricing([{ barcode: asset.barcode, purchase_cost: 200 }], refs.userId)

    const cost = await getAssetCost(asset.id)
    // parts_cost and other_cost were never sent, so they survive and still count in the total.
    expect(cost?.parts_cost).toBe(FULL_PRICING.parts_cost)
    expect(cost?.other_cost).toBe(FULL_PRICING.other_cost)
    expect(cost?.sale_price).toBe(FULL_PRICING.sale_price)
    expect(cost?.purchase_cost).toBe(200)
    expect(cost?.total_cost).toBe(200 + 10 + 8 + 5 + 2 + 3)
  })

  it('applies a bulk update per asset, leaving the others alone', async () => {
    const [first, second] = await createArrivedAssets(refs, 2)
    await patchAssetPricing(first.barcode, FULL_PRICING, refs.userId)
    await patchAssetPricing(second.barcode, FULL_PRICING, refs.userId)

    await bulkUpdateAssetPricing([{ barcode: first.barcode, sale_price: 999 }], refs.userId)

    expect((await getAssetCost(first.id))?.sale_price).toBe(999)
    expect((await getAssetCost(second.id))?.sale_price).toBe(FULL_PRICING.sale_price)
  })

  it('rejects a bulk update when any barcode does not exist', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const items: BulkUpdateAssetPricing['items'] = [
      {
        barcode: asset.barcode,
        purchase_cost: 1,
        transport_cost: 0,
        processing_cost: 0,
        other_cost: 0,
        parts_cost: 0,
        sale_price: 0,
      },
      {
        barcode: 'DOES-NOT-EXIST',
        purchase_cost: 1,
        transport_cost: 0,
        processing_cost: 0,
        other_cost: 0,
        parts_cost: 0,
        sale_price: 0,
      },
    ]

    await expect(bulkUpdateAssetPricing(items, refs.userId)).rejects.toThrow(NotFoundError)
  })
})
