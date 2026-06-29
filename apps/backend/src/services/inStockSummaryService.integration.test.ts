import { OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildUpdateAssetSpecs,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
} from '../../test/factories.js'
import { updateAssetSpecs } from './assetSpecsService.js'
import { createDeparture } from './departureService.js'
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
    await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: assets[0].id, outgoing_status: OUTGOING_STATUS.SOLD },
      ]),
      refs.userId,
    )

    const report = await getInStockSummaryReport()
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

    const report = await getInStockSummaryReport()
    const row = report.find((r) => r.model_id === refs.model.id && r.meter_band === 'HIGH')
    expect(row?.asset_count).toBe(1)
  })
})
