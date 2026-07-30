import type { AssetCost } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const INVOICE_NUMBER = 'INV-1'
const BARCODE = 'BC-1'
const OTHER_BARCODE = 'BC-2'

const mocks = vi.hoisted(() => ({
  patchAssetPricing: vi.fn(),
  invalidateInvoiceLists: vi.fn(),
  flushPendingRemovals: vi.fn(),
}))

vi.mock('@/data/api/asset-api', () => ({ patchAssetPricing: mocks.patchAssetPricing }))
vi.mock('@/data/api/invoice-api', () => ({
  createInvoice: vi.fn(),
  getInvoiceDetail: vi.fn(),
  patchInvoiceAssets: vi.fn(),
  updateInvoiceMetadata: vi.fn(),
}))
vi.mock('@/hooks/use-asset-detail', () => ({ invalidateAssetDetails: vi.fn() }))
vi.mock('@/hooks/use-asset-history', () => ({ invalidateAssetHistory: vi.fn() }))
vi.mock('@/hooks/use-invoice', () => ({
  invoiceDetailKey: (invoiceNumber: string) => `invoice:${invoiceNumber}`,
  invalidateInvoiceLists: mocks.invalidateInvoiceLists,
}))
vi.mock('@/lib/asset-removal-undo', () => ({
  flushPendingRemovals: mocks.flushPendingRemovals,
  scheduleAssetRemoval: vi.fn(),
  scheduleBulkAssetRemoval: vi.fn(),
}))
vi.mock('swr', () => ({ mutate: vi.fn().mockResolvedValue(undefined) }))

function makeCost(purchaseCost: number): AssetCost {
  return {
    purchase_cost: purchaseCost,
    transport_cost: 0,
    processing_cost: 0,
    other_cost: 0,
    parts_cost: 0,
    total_cost: purchaseCost,
    sale_price: 0,
  }
}

interface DeferredSave {
  resolve: (cost: AssetCost) => void
  reject: (reason: Error) => void
}

// Each call to patchAssetPricing hands back a promise this test controls, so the ordering the
// queue guarantees is observable rather than timing-dependent.
function deferSaves(): DeferredSave[] {
  const deferred: DeferredSave[] = []
  mocks.patchAssetPricing.mockImplementation(
    () =>
      new Promise<AssetCost>((resolve, reject) => {
        deferred.push({ resolve, reject })
      }),
  )
  return deferred
}

// Module-level queue and pending-invalidation state, so each test needs a fresh module.
async function loadMutations() {
  vi.resetModules()
  // Aliased because it is not a hook: it returns a module-level object and calls nothing.
  const { useInvoiceMutations: readMutations } = await import('./use-invoice-mutations')
  return readMutations()
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('updatePrice serialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('holds a second save for the same barcode until the first settles', async () => {
    const mutations = await loadMutations()
    const deferred = deferSaves()

    const first = mutations.updatePrice(INVOICE_NUMBER, BARCODE, { purchase_cost: 1 })
    const second = mutations.updatePrice(INVOICE_NUMBER, BARCODE, { transport_cost: 2 })
    await flushMicrotasks()

    expect(mocks.patchAssetPricing).toHaveBeenCalledOnce()

    deferred[0].resolve(makeCost(1))
    await first
    await flushMicrotasks()

    expect(mocks.patchAssetPricing).toHaveBeenCalledTimes(2)
    deferred[1].resolve(makeCost(2))
    await second

    expect(mocks.patchAssetPricing.mock.calls.map(([, patch]) => patch)).toEqual([
      { purchase_cost: 1 },
      { transport_cost: 2 },
    ])
  })

  it('lets saves for different barcodes overlap', async () => {
    const mutations = await loadMutations()
    const deferred = deferSaves()

    const first = mutations.updatePrice(INVOICE_NUMBER, BARCODE, { purchase_cost: 1 })
    const second = mutations.updatePrice(INVOICE_NUMBER, OTHER_BARCODE, { purchase_cost: 2 })
    await flushMicrotasks()

    expect(mocks.patchAssetPricing).toHaveBeenCalledTimes(2)

    deferred[0].resolve(makeCost(1))
    deferred[1].resolve(makeCost(2))
    await Promise.all([first, second])
  })

  it('rejects only the failed call and still runs the next save for that barcode', async () => {
    const mutations = await loadMutations()
    const deferred = deferSaves()

    const first = mutations.updatePrice(INVOICE_NUMBER, BARCODE, { purchase_cost: 1 })
    const second = mutations.updatePrice(INVOICE_NUMBER, BARCODE, { transport_cost: 2 })
    await flushMicrotasks()

    deferred[0].reject(new Error('nope'))
    await expect(first).rejects.toThrow('nope')
    await flushMicrotasks()

    expect(mocks.patchAssetPricing).toHaveBeenCalledTimes(2)
    deferred[1].resolve(makeCost(2))
    await expect(second).resolves.toBeUndefined()
  })
})

describe('flushPending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not revalidate the invoice lists while prices are being saved', async () => {
    const mutations = await loadMutations()
    mocks.patchAssetPricing.mockResolvedValue(makeCost(1))

    await mutations.updatePrice(INVOICE_NUMBER, BARCODE, { purchase_cost: 1 })
    await mutations.updatePrice(INVOICE_NUMBER, OTHER_BARCODE, { purchase_cost: 2 })

    expect(mocks.invalidateInvoiceLists).not.toHaveBeenCalled()
  })

  it('revalidates the invoice lists once for a run of price edits', async () => {
    const mutations = await loadMutations()
    mocks.patchAssetPricing.mockResolvedValue(makeCost(1))

    await mutations.updatePrice(INVOICE_NUMBER, BARCODE, { purchase_cost: 1 })
    await mutations.updatePrice(INVOICE_NUMBER, BARCODE, { transport_cost: 2 })
    mutations.flushPending(INVOICE_NUMBER)
    mutations.flushPending(INVOICE_NUMBER)

    expect(mocks.invalidateInvoiceLists).toHaveBeenCalledOnce()
  })

  it('does not revalidate the invoice lists when no price changed', async () => {
    const mutations = await loadMutations()

    mutations.flushPending(INVOICE_NUMBER)

    expect(mocks.flushPendingRemovals).toHaveBeenCalledWith(INVOICE_NUMBER)
    expect(mocks.invalidateInvoiceLists).not.toHaveBeenCalled()
  })
})
