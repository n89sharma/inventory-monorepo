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

  it('computes total_cost as the sum of the five cost components', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await patchAssetPricing(asset.barcode, FULL_PRICING, refs.userId)

    const cost = await getAssetCost(asset.id)
    expect(cost?.total_cost).toBe(120)
    expect(cost?.purchase_cost).toBe(100)
    expect(cost?.sale_price).toBe(200)
  })

  it('leaves fields the patch omits untouched and recomputes the total', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await patchAssetPricing(asset.barcode, FULL_PRICING, refs.userId)

    const returned = await patchAssetPricing(asset.barcode, { purchase_cost: 150 }, refs.userId)

    expect(returned).toEqual({ ...FULL_PRICING, purchase_cost: 150, total_cost: 170 })
    const cost = await getAssetCost(asset.id)
    expect(cost?.purchase_cost).toBe(150)
    expect(cost?.transport_cost).toBe(10)
    expect(cost?.other_cost).toBe(2)
    expect(cost?.parts_cost).toBe(3)
    expect(cost?.sale_price).toBe(200)
    expect(cost?.total_cost).toBe(170)
  })

  it('creates the cost row when the asset has none, leaving unpatched fields null', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    const returned = await patchAssetPricing(asset.barcode, { sale_price: 75 }, refs.userId)

    expect(returned).toEqual({
      purchase_cost: null,
      transport_cost: null,
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
