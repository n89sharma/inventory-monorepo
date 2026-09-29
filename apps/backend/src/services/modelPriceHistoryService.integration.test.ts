import { OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  createLoadedDeparture,
  seedArrivalTestData,
} from '../../test/factories.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { patchAssetPricing } from './assetPricingService.js'
import { getModelPriceHistory } from './modelPriceHistoryService.js'

const MISSING_ID = 999999

describe('modelPriceHistoryService', () => {
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

  it('reports the in-stock count for the model', async () => {
    await createArrivedAssets(refs, 3)

    const result = await getModelPriceHistory(refs.model.id)
    expect(result.in_stock_count).toBe(3)
  })

  it('includes a sold asset with a sale price in the sales list', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await patchAssetPricing(asset.barcode, { purchase_cost: 100, sale_price: 500 }, refs.userId)
    await createLoadedDeparture(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }])

    const result = await getModelPriceHistory(refs.model.id)
    expect(result.sales).toHaveLength(1)
    expect(result.sales[0].sale_price).toBe(500)
    expect(result.sales[0].vendor).toBe(refs.vendor.name)
    expect(result.sales[0].arrived_at).not.toBeNull()
    expect(result.last_sale).not.toBeNull()
    expect(result.in_stock_count).toBe(0)
  })

  it('throws NotFoundError for an unknown model', async () => {
    await expect(getModelPriceHistory(MISSING_ID)).rejects.toThrow(NotFoundError)
  })
  it('reports the departure date as the sale date', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await patchAssetPricing(asset.barcode, { purchase_cost: 100, sale_price: 500 }, refs.userId)
    const departureNumber = await createLoadedDeparture(refs, [
      { id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD },
    ])
    const departureDate = new Date().toISOString().slice(0, 10)
    await prisma.departure.update({
      where: { departure_number: departureNumber },
      data: { departure_date: new Date(departureDate) },
    })

    const result = await getModelPriceHistory(refs.model.id)

    expect(result.sales[0].departed_at).toBe(departureDate)
  })
})
