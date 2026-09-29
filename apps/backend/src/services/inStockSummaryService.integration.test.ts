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
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { updateAssetSpecs } from './assetSpecsService.js'
import { getInStockSummaryReport } from './inStockSummaryService.js'

describe('inStockSummaryService', () => {
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

  it('counts only IN_STOCK assets, excluding departed ones', async () => {
    const assets = await createArrivedAssets(refs, 3)
    await createLoadedDeparture(refs, [{ id: assets[0].id, outgoing_status: OUTGOING_STATUS.SOLD }])

    const report = await getInStockSummaryReport(ALL_PRICE_PERMISSIONS)
    const total = report.reduce((sum, row) => sum + (row.asset_count ?? 0), 0)
    expect(total).toBe(2)
  })

  it('buckets a high-meter asset into the HIGH meter band', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { meter_black: 300000 }),
      refs.userId,
    )

    const report = await getInStockSummaryReport(ALL_PRICE_PERMISSIONS)
    const row = report.find((r) => r.model_id === refs.model.id && r.meter_band === 'HIGH')
    expect(row?.asset_count).toBe(1)
  })

  it('returns cost sums and costed counts, leaving an uncosted asset out of the costed count', async () => {
    const [first, second, uncosted] = await createArrivedAssets(refs, 3)
    await seedAssetCost(first.id)
    await seedAssetCost(second.id)
    await seedAssetCost(uncosted.id, REDACTED_ASSET_COST)

    const report = await getInStockSummaryReport(ALL_PRICE_PERMISSIONS)
    const row = report.find((r) => r.model_id === refs.model.id)
    expect(row).toMatchObject({
      asset_count: 3,
      purchase_cost_sum: (SEEDED_ASSET_COST.purchase_cost ?? 0) * 2,
      purchase_cost_count: 2,
      total_cost_sum: (SEEDED_ASSET_COST.total_cost ?? 0) * 2,
      total_cost_count: 2,
    })
  })

  it('withholds cost sums from a caller without purchase-price permission', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)

    const report = await getInStockSummaryReport(NO_PERMISSIONS)
    const row = report.find((r) => r.model_id === refs.model.id)
    expect(row).toMatchObject({ purchase_cost_sum: null, total_cost_sum: null })
  })

  it('returns a separate row per warehouse for the same model', async () => {
    await createArrivedAssets(refs, 2)
    await createArrivedAssets({ ...refs, warehouse: refs.warehouse2 }, 1)

    const report = await getInStockSummaryReport(ALL_PRICE_PERMISSIONS)
    const counts = Object.fromEntries(
      report
        .filter((r) => r.model_id === refs.model.id)
        .map((r) => [r.warehouse_id, r.asset_count]),
    )
    expect(counts).toEqual({ [refs.warehouse.id]: 2, [refs.warehouse2.id]: 1 })
  })
})
