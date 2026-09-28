import { beforeEach, describe, expect, it, vi } from 'vitest'

const TRANSFER_NUMBER = 'T-YYZ-0000001'
const BARCODE = 'YYZ-0000001'

const mocks = vi.hoisted(() => ({
  scheduleTransfer: vi.fn(),
  updateTransferDate: vi.fn(),
  startLoadingTransfer: vi.fn(),
  departTransfer: vi.fn(),
  startUnloadingTransfer: vi.fn(),
  completeTransfer: vi.fn(),
  scanTransferAssetLoaded: vi.fn(),
  scanTransferAssetUnloaded: vi.fn(),
  markTransferAssetMissingAtLoad: vi.fn(),
  markTransferAssetMissingAtUnload: vi.fn(),
  invalidateAssetDetails: vi.fn(),
  invalidateTransferLists: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@/data/api/transfer-api', () => ({
  createTransfer: vi.fn(),
  deleteTransfer: vi.fn(),
  getTransferDetail: vi.fn(),
  patchTransferAssets: vi.fn(),
  returnTransferAssetsToOrigin: vi.fn(),
  updateTransferMetadata: vi.fn(),
  updateTransferNotes: vi.fn(),
  scheduleTransfer: mocks.scheduleTransfer,
  updateTransferDate: mocks.updateTransferDate,
  startLoadingTransfer: mocks.startLoadingTransfer,
  departTransfer: mocks.departTransfer,
  startUnloadingTransfer: mocks.startUnloadingTransfer,
  completeTransfer: mocks.completeTransfer,
  scanTransferAssetLoaded: mocks.scanTransferAssetLoaded,
  scanTransferAssetUnloaded: mocks.scanTransferAssetUnloaded,
  markTransferAssetMissingAtLoad: mocks.markTransferAssetMissingAtLoad,
  markTransferAssetMissingAtUnload: mocks.markTransferAssetMissingAtUnload,
}))

vi.mock('@/hooks/use-asset-detail', () => ({
  invalidateAssetDetails: mocks.invalidateAssetDetails,
}))

vi.mock('@/hooks/use-transfer', () => ({
  transferDetailKey: (transferNumber: string) => `transfer:${transferNumber}`,
  clearTransferDetail: vi.fn(),
  invalidateTransferLists: mocks.invalidateTransferLists,
}))

vi.mock('@/lib/asset-price-save', () => ({
  saveAssetPrice: vi.fn(),
  flushPendingPriceInvalidation: vi.fn(),
}))

vi.mock('@/lib/asset-removal-undo', () => ({
  flushPendingRemovals: vi.fn(),
  scheduleBulkAssetRemoval: vi.fn(),
}))

vi.mock('swr', () => ({ mutate: mocks.mutate }))

// Aliased because it is not a hook: it returns a module-level object and calls nothing.
async function loadMutations() {
  const { useTransferMutations: readMutations } = await import('./use-transfer-mutations')
  return readMutations()
}

describe('use-transfer-mutations invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('schedule invalidates transfer detail and lists, not asset details', async () => {
    const mutations = await loadMutations()
    await mutations.schedule(TRANSFER_NUMBER, '2026-01-01')

    expect(mocks.scheduleTransfer).toHaveBeenCalledWith(TRANSFER_NUMBER, '2026-01-01')
    expect(mocks.mutate).toHaveBeenCalledWith(`transfer:${TRANSFER_NUMBER}`)
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateAssetDetails).not.toHaveBeenCalled()
  })

  it('updateDate invalidates transfer detail and lists, not asset details', async () => {
    const mutations = await loadMutations()
    await mutations.updateDate(TRANSFER_NUMBER, '2026-01-02')

    expect(mocks.updateTransferDate).toHaveBeenCalledWith(TRANSFER_NUMBER, '2026-01-02')
    expect(mocks.mutate).toHaveBeenCalledWith(`transfer:${TRANSFER_NUMBER}`)
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateAssetDetails).not.toHaveBeenCalled()
  })

  it('startLoading invalidates transfer detail and lists, not asset details', async () => {
    const mutations = await loadMutations()
    await mutations.startLoading(TRANSFER_NUMBER)

    expect(mocks.startLoadingTransfer).toHaveBeenCalledWith(TRANSFER_NUMBER)
    expect(mocks.mutate).toHaveBeenCalledWith(`transfer:${TRANSFER_NUMBER}`)
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateAssetDetails).not.toHaveBeenCalled()
  })

  it('depart invalidates transfer detail, lists, and the traveling assets', async () => {
    const mutations = await loadMutations()
    await mutations.depart(TRANSFER_NUMBER, [BARCODE], null)

    expect(mocks.departTransfer).toHaveBeenCalledWith(TRANSFER_NUMBER, null)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
  })

  it('startUnloading invalidates transfer detail and lists, not asset details', async () => {
    const mutations = await loadMutations()
    await mutations.startUnloading(TRANSFER_NUMBER)

    expect(mocks.startUnloadingTransfer).toHaveBeenCalledWith(TRANSFER_NUMBER)
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateAssetDetails).not.toHaveBeenCalled()
  })

  it('complete invalidates transfer detail, lists, and the unloaded assets', async () => {
    const mutations = await loadMutations()
    await mutations.complete(TRANSFER_NUMBER, [BARCODE])

    expect(mocks.completeTransfer).toHaveBeenCalledWith(TRANSFER_NUMBER)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
  })

  it('scanLoaded invalidates transfer detail, lists, and the scanned asset', async () => {
    const mutations = await loadMutations()
    await mutations.scanLoaded(TRANSFER_NUMBER, 1, BARCODE)

    expect(mocks.scanTransferAssetLoaded).toHaveBeenCalledWith(TRANSFER_NUMBER, 1)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
  })

  it('scanUnloaded invalidates transfer detail, lists, and the scanned asset', async () => {
    const mutations = await loadMutations()
    await mutations.scanUnloaded(TRANSFER_NUMBER, 1, BARCODE)

    expect(mocks.scanTransferAssetUnloaded).toHaveBeenCalledWith(TRANSFER_NUMBER, 1)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
  })

  it('markMissingAtLoad invalidates transfer detail, lists, and the asset', async () => {
    const mutations = await loadMutations()
    await mutations.markMissingAtLoad(TRANSFER_NUMBER, 1, BARCODE)

    expect(mocks.markTransferAssetMissingAtLoad).toHaveBeenCalledWith(TRANSFER_NUMBER, 1)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
  })

  it('markMissingAtUnload invalidates transfer detail, lists, and the asset', async () => {
    const mutations = await loadMutations()
    await mutations.markMissingAtUnload(TRANSFER_NUMBER, 1, BARCODE)

    expect(mocks.markTransferAssetMissingAtUnload).toHaveBeenCalledWith(TRANSFER_NUMBER, 1)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateTransferLists).toHaveBeenCalledOnce()
  })
})
