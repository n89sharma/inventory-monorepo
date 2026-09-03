import { OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { createDeparture } from './departureService.js'
import { getProfitabilityCube } from './profitabilityService.js'

const NO_COST: typeof SEEDED_ASSET_COST = {
  purchase_cost: null,
  transport_cost: null,
  transfer_cost: null,
  processing_cost: null,
  other_cost: null,
  parts_cost: null,
  total_cost: null,
  sale_price: null,
}

const CURRENT_YEAR = new Date().getFullYear()

async function departSoldAsset(
  refs: ArrivalTestData,
  cost: typeof SEEDED_ASSET_COST,
): Promise<void> {
  const [asset] = await createArrivedAssets(refs, 1)
  await createDeparture(
    buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
    refs.userId,
  )
  await seedAssetCost(asset.id, cost)
}

async function cubeTotals() {
  const rows = await getProfitabilityCube(CURRENT_YEAR)
  return {
    assets: rows.reduce((sum, r) => sum + (r.asset_count ?? 0), 0),
    revenue: rows.reduce((sum, r) => sum + (r.gross_revenue ?? 0), 0),
    cogs: rows.reduce((sum, r) => sum + (r.cogs ?? 0), 0),
    margin: rows.reduce((sum, r) => sum + (r.gross_margin ?? 0), 0),
  }
}

describe('getProfitabilityCube', () => {
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

  it('counts an asset whose costs are all present', async () => {
    await departSoldAsset(refs, SEEDED_ASSET_COST)

    expect(await cubeTotals()).toEqual({
      assets: 1,
      revenue: SEEDED_ASSET_COST.sale_price,
      cogs: SEEDED_ASSET_COST.total_cost,
      margin: SEEDED_ASSET_COST.sale_price! - SEEDED_ASSET_COST.total_cost!,
    })
  })

  // The old filter required a positive total_cost, so a sale against no cost was dropped
  // entirely and its revenue went missing from the report.
  it('counts a sale recorded against a zero cost as pure margin', async () => {
    await departSoldAsset(refs, { ...NO_COST, total_cost: 0, sale_price: 500 })

    expect(await cubeTotals()).toEqual({ assets: 1, revenue: 500, cogs: 0, margin: 500 })
  })

  // Nothing writes a sale price without a total, but the sums must not drop a row from the
  // margin while keeping it in revenue if one ever appears.
  it('reads an absent cost as zero so revenue and margin still reconcile', async () => {
    await departSoldAsset(refs, { ...NO_COST, sale_price: 900 })

    const totals = await cubeTotals()
    expect(totals).toEqual({ assets: 1, revenue: 900, cogs: 0, margin: 900 })
    expect(totals.margin).toBe(totals.revenue - totals.cogs)
  })

  it('ignores a departed asset that was never given a sale price', async () => {
    await departSoldAsset(refs, { ...NO_COST, purchase_cost: 300, total_cost: 300 })

    expect(await cubeTotals()).toEqual({ assets: 0, revenue: 0, cogs: 0, margin: 0 })
  })
})
