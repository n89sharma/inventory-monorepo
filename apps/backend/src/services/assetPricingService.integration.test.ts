import { BulkUpdateAssetPricing } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetCost,
  seedReferenceData,
} from '../../test/factories.js'
import { NotFoundError } from '../lib/errors.js'
import { bulkUpdateAssetPricing, updateAssetPricing } from './assetPricingService.js'

describe('assetPricingService', () => {
  let refs: ArrivalRefs

  beforeAll(async () => {
    refs = await seedReferenceData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('computes total_cost as the sum of the five cost components', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await updateAssetPricing(
      asset.barcode,
      {
        purchase_cost: 100,
        transport_cost: 10,
        processing_cost: 5,
        other_cost: 2,
        parts_cost: 3,
        sale_price: 200,
      },
      refs.userId,
    )

    const cost = await getAssetCost(asset.id)
    expect(cost?.total_cost).toBe(120)
    expect(cost?.purchase_cost).toBe(100)
    expect(cost?.sale_price).toBe(200)
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
