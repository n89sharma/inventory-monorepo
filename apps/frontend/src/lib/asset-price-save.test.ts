import { makeAssetSearchRow } from '@/test/asset-factories'
import type { AssetCost, AssetSearchRow } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const DETAIL_CACHE_KEY = 'invoice:INV-1'
const BARCODE = 'BC-1'
const OTHER_BARCODE = 'BC-2'

const mocks = vi.hoisted(() => ({
  patchAssetPricing: vi.fn(),
  mutate: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/data/api/asset-api', () => ({ patchAssetPricing: mocks.patchAssetPricing }))
vi.mock('@/hooks/use-asset-detail', () => ({ invalidateAssetDetails: vi.fn() }))
vi.mock('@/hooks/use-asset-history', () => ({ invalidateAssetHistory: vi.fn() }))
vi.mock('swr', () => ({ mutate: mocks.mutate }))

const SPEC = { detailCacheKey: DETAIL_CACHE_KEY, invalidateLists: vi.fn() }

const RECOMPUTED_COST: AssetCost = {
  purchase_cost: 300,
  transport_cost: 20,
  processing_cost: 5,
  other_cost: 0,
  parts_cost: 0,
  total_cost: 325,
  sale_price: 200,
}

// Module-level save queue, so each test needs a fresh module.
async function loadSaveAssetPrice() {
  vi.resetModules()
  const { saveAssetPrice } = await import('./asset-price-save')
  return saveAssetPrice
}

// The updater handed to mutate is what actually rewrites the cached row.
function applyCacheUpdate(assets: AssetSearchRow[]): AssetSearchRow[] {
  const calls = mocks.mutate.mock.calls
  const updater = calls[calls.length - 1]?.[1]
  if (typeof updater !== 'function') throw new Error('Expected a cache updater function')
  return updater({ assets }).assets
}

describe('saveAssetPrice cache update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutate.mockResolvedValue(undefined)
    mocks.patchAssetPricing.mockResolvedValue(RECOMPUTED_COST)
  })

  it('writes the server-recomputed total onto the edited row', async () => {
    const saveAssetPrice = await loadSaveAssetPrice()

    await saveAssetPrice(SPEC, BARCODE, { purchase_cost: 300 })
    const [row] = applyCacheUpdate([
      makeAssetSearchRow({ barcode: BARCODE, cost_purchase_cost: 100, cost_total_cost: 125 }),
    ])

    expect(row.cost_purchase_cost).toBe(300)
    expect(row.cost_total_cost).toBe(325)
  })

  it('refreshes every cost field, not only the one that was patched', async () => {
    const saveAssetPrice = await loadSaveAssetPrice()

    await saveAssetPrice(SPEC, BARCODE, { purchase_cost: 300 })
    const [row] = applyCacheUpdate([makeAssetSearchRow({ barcode: BARCODE })])

    expect(row).toMatchObject({
      cost_purchase_cost: RECOMPUTED_COST.purchase_cost,
      cost_transport_cost: RECOMPUTED_COST.transport_cost,
      cost_processing_cost: RECOMPUTED_COST.processing_cost,
      cost_other_cost: RECOMPUTED_COST.other_cost,
      cost_parts_cost: RECOMPUTED_COST.parts_cost,
      cost_total_cost: RECOMPUTED_COST.total_cost,
      cost_sale_price: RECOMPUTED_COST.sale_price,
    })
  })

  it('leaves the other rows untouched', async () => {
    const saveAssetPrice = await loadSaveAssetPrice()
    const untouched = makeAssetSearchRow({
      barcode: OTHER_BARCODE,
      cost_purchase_cost: 1,
      cost_total_cost: 1,
    })

    await saveAssetPrice(SPEC, BARCODE, { purchase_cost: 300 })
    const rows = applyCacheUpdate([makeAssetSearchRow({ barcode: BARCODE }), untouched])

    expect(rows[1]).toBe(untouched)
  })
})
