import { describe, expect, it } from 'vitest'
import type { InStockSummaryRow, MeterBand } from 'shared-types'
import { buildInStockSummaryGroups } from './in-stock-summary-grouping'

const YYZ = 1
const DFW = 2
const CANON = 10
const COPIER = 20
const IRADX = 100
const IMAGERUNNER = 101

type Stock = {
  warehouse: number
  model: number
  band: MeterBand
  assets: number
  purchaseCosts: (number | null)[]
}

function stocked({ warehouse, model, band, assets, purchaseCosts }: Stock): InStockSummaryRow {
  const recorded = purchaseCosts.filter((cost): cost is number => cost !== null)
  const sum = recorded.length === 0 ? null : recorded.reduce((total, cost) => total + cost, 0)
  return {
    warehouse_id: warehouse,
    brand_id: CANON,
    brand_name: 'Canon',
    asset_type_id: COPIER,
    asset_type: 'COPIER',
    model_id: model,
    model_name: `Model ${model}`,
    meter_band: band,
    purchase_cost_sum: sum,
    purchase_cost_count: recorded.length,
    total_cost_sum: sum,
    total_cost_count: recorded.length,
    asset_count: assets,
  }
}

describe('buildInStockSummaryGroups', () => {
  it('combines one model across warehouses and meter bands into a single row', () => {
    const groups = buildInStockSummaryGroups([
      stocked({ warehouse: YYZ, model: IRADX, band: 'LOW', assets: 2, purchaseCosts: [100, 100] }),
      stocked({ warehouse: DFW, model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [100] }),
      stocked({ warehouse: DFW, model: IRADX, band: 'HIGH', assets: 1, purchaseCosts: [100] }),
      stocked({ warehouse: YYZ, model: IMAGERUNNER, band: 'LOW', assets: 5, purchaseCosts: [] }),
    ])
    expect(groups.map((group) => [group.model_id, group.asset_count])).toEqual([
      [IRADX, 4],
      [IMAGERUNNER, 5],
    ])
  })

  it('averages over the assets that have a cost, not over every asset', () => {
    const [group] = buildInStockSummaryGroups([
      stocked({ warehouse: YYZ, model: IRADX, band: 'LOW', assets: 2, purchaseCosts: [100, null] }),
      stocked({ warehouse: DFW, model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [400] }),
    ])
    expect(group.asset_count).toBe(3)
    expect(group.avg_purchase_cost).toBe(250)
    expect(group.avg_total_cost).toBe(250)
  })

  it('shows no average when no asset in the model has a cost', () => {
    const [group] = buildInStockSummaryGroups([
      stocked({
        warehouse: YYZ,
        model: IRADX,
        band: 'LOW',
        assets: 2,
        purchaseCosts: [null, null],
      }),
    ])
    expect(group.avg_purchase_cost).toBeNull()
  })

  it('shows no average when the cost totals were withheld', () => {
    const redacted = {
      ...stocked({ warehouse: YYZ, model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [100] }),
      purchase_cost_sum: null,
      total_cost_sum: null,
    }
    const [group] = buildInStockSummaryGroups([redacted])
    expect(group.avg_purchase_cost).toBeNull()
    expect(group.avg_total_cost).toBeNull()
  })
})
