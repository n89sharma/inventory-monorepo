import { OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  buildCreateDepartureInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedReferenceData,
} from '../../test/factories.js'
import { NotFoundError } from '../lib/errors.js'
import { updateAssetPricing } from './assetPricingService.js'
import { createDeparture } from './departureService.js'
import { getModelSales } from './modelSalesService.js'

const MISSING_ID = 999999

describe('modelSalesService', () => {
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

  it('reports the in-stock count for the model', async () => {
    await createArrivedAssets(refs, 3)

    const result = await getModelSales(refs.model.id)
    expect(result.in_stock_count).toBe(3)
  })

  it('includes a sold asset with a sale price in the sales list', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await updateAssetPricing(
      asset.barcode,
      {
        purchase_cost: 100,
        transport_cost: 0,
        processing_cost: 0,
        other_cost: 0,
        parts_cost: 0,
        sale_price: 500,
      },
      refs.userId,
    )
    await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    const result = await getModelSales(refs.model.id)
    expect(result.sales).toHaveLength(1)
    expect(result.sales[0].sale_price).toBe(500)
    expect(result.last_sale).not.toBeNull()
    expect(result.in_stock_count).toBe(0)
  })

  it('throws NotFoundError for an unknown model', async () => {
    await expect(getModelSales(MISSING_ID)).rejects.toThrow(NotFoundError)
  })
})
