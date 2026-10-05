import { OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ALL_PRICE_PERMISSIONS,
  ArrivalTestData,
  buildUpdateAssetSpecs,
  cleanupTransactionalData,
  createArrivedAssets,
  createLoadedDeparture,
  NO_PERMISSIONS,
  PURCHASE_PRICE_ONLY,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { prisma } from '../prisma.js'
import { patchAssetPricing } from './assetPricingService.js'
import { updateAssetSpecs } from './assetSpecsService.js'
import { getInStockSummaryReport } from './inStockSummaryService.js'

const SALES_FROM = '2026-04-05'
const DAY_BEFORE_SALES_FROM = '2026-04-04'

describe('inStockSummaryService', () => {
  let refs: ArrivalTestData

  async function sell(salePrice: number, departureDate: string, meterBlack: number | null) {
    const [asset] = await createArrivedAssets(refs, 1)
    if (meterBlack === null) {
      await prisma.technicalSpecification.update({
        where: { asset_id: asset.id },
        data: { meter_total: null },
      })
    } else {
      await updateAssetSpecs(
        asset.barcode,
        buildUpdateAssetSpecs(refs, { meter_black: meterBlack }),
        refs.userId,
      )
    }
    await patchAssetPricing(asset.barcode, { sale_price: salePrice }, refs.userId)
    const departureNumber = await createLoadedDeparture(refs, [
      { id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD },
    ])
    await prisma.departure.update({
      where: { departure_number: departureNumber },
      data: { departure_date: new Date(departureDate) },
    })
  }

  async function salePricesByBand() {
    const report = await getInStockSummaryReport(SALES_FROM, ALL_PRICE_PERMISSIONS)
    return Object.fromEntries(
      (report.sale_prices ?? [])
        .filter((group) => group.model_id === refs.model.id)
        .map((group) => [group.meter_band, group.sale_prices.toSorted((a, b) => a - b)]),
    )
  }

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('counts only IN_STOCK assets, excluding departed ones', async () => {
    const assets = await createArrivedAssets(refs, 3)
    await createLoadedDeparture(refs, [{ id: assets[0].id, outgoing_status: OUTGOING_STATUS.SOLD }])

    const report = await getInStockSummaryReport(SALES_FROM, ALL_PRICE_PERMISSIONS)
    const total = report.stock.reduce((sum, row) => sum + (row.in_stock_count ?? 0), 0)
    expect(total).toBe(2)
  })

  it('buckets a high-meter asset into the HIGH meter band', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { meter_black: 300000 }),
      refs.userId,
    )

    const report = await getInStockSummaryReport(SALES_FROM, ALL_PRICE_PERMISSIONS)
    const row = report.stock.find((r) => r.model_id === refs.model.id && r.meter_band === 'HIGH')
    expect(row?.in_stock_count).toBe(1)
  })

  it('returns cost sums and costed counts, leaving an uncosted asset out of the costed count', async () => {
    const [first, second, uncosted] = await createArrivedAssets(refs, 3)
    await seedAssetCost(first.id)
    await seedAssetCost(second.id)
    await seedAssetCost(uncosted.id, REDACTED_ASSET_COST)

    const report = await getInStockSummaryReport(SALES_FROM, ALL_PRICE_PERMISSIONS)
    const row = report.stock.find((r) => r.model_id === refs.model.id)
    expect(row).toMatchObject({
      in_stock_count: 3,
      purchase_cost_sum: (SEEDED_ASSET_COST.purchase_cost ?? 0) * 2,
      purchase_cost_count: 2,
      total_cost_sum: (SEEDED_ASSET_COST.total_cost ?? 0) * 2,
      total_cost_count: 2,
    })
  })

  it('withholds cost sums from a caller without purchase-price permission', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)

    const report = await getInStockSummaryReport(SALES_FROM, NO_PERMISSIONS)
    const row = report.stock.find((r) => r.model_id === refs.model.id)
    expect(row).toMatchObject({ purchase_cost_sum: null, total_cost_sum: null })
  })

  it('returns a separate row per warehouse for the same model', async () => {
    await createArrivedAssets(refs, 2)
    await createArrivedAssets({ ...refs, warehouse: refs.warehouse2 }, 1)

    const report = await getInStockSummaryReport(SALES_FROM, ALL_PRICE_PERMISSIONS)
    const counts = Object.fromEntries(
      report.stock
        .filter((r) => r.model_id === refs.model.id)
        .map((r) => [r.warehouse_id, r.in_stock_count]),
    )
    expect(counts).toEqual({ [refs.warehouse.id]: 2, [refs.warehouse2.id]: 1 })
  })

  it('groups sale prices of sold assets by model and meter band', async () => {
    await sell(400, SALES_FROM, 300000)
    await sell(600, SALES_FROM, 300000)
    await sell(900, SALES_FROM, 10000)

    expect(await salePricesByBand()).toEqual({ HIGH: [400, 600], LOW: [900] })
  })

  it('includes a sale departed on the start date and excludes one departed the day before', async () => {
    await sell(500, SALES_FROM, 10000)
    await sell(700, DAY_BEFORE_SALES_FROM, 10000)

    expect(await salePricesByBand()).toEqual({ LOW: [500] })
  })

  it('counts $0 sales', async () => {
    await sell(0, SALES_FROM, 10000)
    await sell(800, SALES_FROM, 10000)

    expect(await salePricesByBand()).toEqual({ LOW: [0, 800] })
  })

  it('excludes assets that are not sold', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await patchAssetPricing(asset.barcode, { sale_price: 500 }, refs.userId)

    expect(await salePricesByBand()).toEqual({})
  })

  it('puts a sale with no meter reading in the UNKNOWN band', async () => {
    await sell(500, SALES_FROM, null)

    expect(await salePricesByBand()).toEqual({ UNKNOWN: [500] })
  })

  it('withholds sale prices from a caller without sale-price permission, keeping stock rows', async () => {
    await createArrivedAssets(refs, 1)
    await sell(500, SALES_FROM, 10000)

    const report = await getInStockSummaryReport(SALES_FROM, PURCHASE_PRICE_ONLY)
    expect(report.sale_prices).toBeNull()
    expect(report.stock.find((r) => r.model_id === refs.model.id)?.in_stock_count).toBe(1)
  })
})
