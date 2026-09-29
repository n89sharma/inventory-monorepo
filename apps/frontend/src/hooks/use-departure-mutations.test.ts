import { beforeEach, describe, expect, it, vi } from 'vitest'

const DEPARTURE_NUMBER = 'D-YYZ-0000001'
const BARCODE = 'YYZ-0000001'

const mocks = vi.hoisted(() => ({
  scheduleDeparture: vi.fn(),
  updateDepartureDate: vi.fn(),
  startLoadingDeparture: vi.fn(),
  finishLoadingDeparture: vi.fn(),
  completeDeparture: vi.fn(),
  scanDepartureAssetLoaded: vi.fn(),
  markDepartureAssetMissingAtLoad: vi.fn(),
  undoDepartureAssetLoad: vi.fn(),
  invalidateAssetDetails: vi.fn(),
  invalidateDepartureLists: vi.fn(),
  invalidateHoldLists: vi.fn(),
  invalidateSearchOnHand: vi.fn(),
  invalidateSearchMissing: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@/data/api/departure-api', () => ({
  createDeparture: vi.fn(),
  getDepartureDetail: vi.fn(),
  patchDepartureAssets: vi.fn(),
  returnDepartureAssetsToStock: vi.fn(),
  setDepartureOutgoingStatus: vi.fn(),
  updateDepartureMetadata: vi.fn(),
  updateDepartureNotes: vi.fn(),
  scheduleDeparture: mocks.scheduleDeparture,
  updateDepartureDate: mocks.updateDepartureDate,
  startLoadingDeparture: mocks.startLoadingDeparture,
  finishLoadingDeparture: mocks.finishLoadingDeparture,
  completeDeparture: mocks.completeDeparture,
  scanDepartureAssetLoaded: mocks.scanDepartureAssetLoaded,
  markDepartureAssetMissingAtLoad: mocks.markDepartureAssetMissingAtLoad,
  undoDepartureAssetLoad: mocks.undoDepartureAssetLoad,
}))

vi.mock('@/hooks/use-asset-detail', () => ({
  invalidateAssetDetails: mocks.invalidateAssetDetails,
}))

vi.mock('@/hooks/use-departure', () => ({
  departureDetailKey: (departureNumber: string) => `departure:${departureNumber}`,
  invalidateDepartureLists: mocks.invalidateDepartureLists,
}))

vi.mock('@/hooks/use-hold', () => ({ invalidateHoldLists: mocks.invalidateHoldLists }))

vi.mock('@/hooks/use-invoice', () => ({ invalidateInvoiceLists: vi.fn() }))

vi.mock('@/hooks/use-search-onhand', () => ({
  invalidateSearchOnHand: mocks.invalidateSearchOnHand,
}))

vi.mock('@/hooks/use-search-missing', () => ({
  invalidateSearchMissing: mocks.invalidateSearchMissing,
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
  const { useDepartureMutations: readMutations } = await import('./use-departure-mutations')
  return readMutations()
}

describe('use-departure-mutations invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('schedule invalidates departure detail and lists, not asset details', async () => {
    const mutations = await loadMutations()
    await mutations.schedule(DEPARTURE_NUMBER, '2026-01-01')

    expect(mocks.scheduleDeparture).toHaveBeenCalledWith(DEPARTURE_NUMBER, '2026-01-01')
    expect(mocks.mutate).toHaveBeenCalledWith(`departure:${DEPARTURE_NUMBER}`)
    expect(mocks.invalidateDepartureLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateAssetDetails).not.toHaveBeenCalled()
  })

  it('updateDate, startLoading, finishLoading and complete invalidate detail and lists only', async () => {
    const mutations = await loadMutations()
    await mutations.updateDate(DEPARTURE_NUMBER, '2026-01-02')
    await mutations.startLoading(DEPARTURE_NUMBER)
    await mutations.finishLoading(DEPARTURE_NUMBER)
    await mutations.complete(DEPARTURE_NUMBER)

    expect(mocks.updateDepartureDate).toHaveBeenCalledWith(DEPARTURE_NUMBER, '2026-01-02')
    expect(mocks.startLoadingDeparture).toHaveBeenCalledWith(DEPARTURE_NUMBER)
    expect(mocks.finishLoadingDeparture).toHaveBeenCalledWith(DEPARTURE_NUMBER)
    expect(mocks.completeDeparture).toHaveBeenCalledWith(DEPARTURE_NUMBER)
    expect(mocks.invalidateDepartureLists).toHaveBeenCalledTimes(4)
    expect(mocks.invalidateAssetDetails).not.toHaveBeenCalled()
  })

  it('scanLoaded refreshes the asset, stock and hold views', async () => {
    const mutations = await loadMutations()
    await mutations.scanLoaded(DEPARTURE_NUMBER, 1, BARCODE)

    expect(mocks.scanDepartureAssetLoaded).toHaveBeenCalledWith(DEPARTURE_NUMBER, 1)
    expect(mocks.mutate).toHaveBeenCalledWith(`departure:${DEPARTURE_NUMBER}`)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateDepartureLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateSearchOnHand).toHaveBeenCalledOnce()
    expect(mocks.invalidateHoldLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateSearchMissing).not.toHaveBeenCalled()
  })

  it('markMissingAtLoad also refreshes the Missing list', async () => {
    const mutations = await loadMutations()
    await mutations.markMissingAtLoad(DEPARTURE_NUMBER, 1, BARCODE)

    expect(mocks.markDepartureAssetMissingAtLoad).toHaveBeenCalledWith(DEPARTURE_NUMBER, 1)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateSearchMissing).toHaveBeenCalledOnce()
  })

  it('undoLoad refreshes the asset, stock and hold views', async () => {
    const mutations = await loadMutations()
    await mutations.undoLoad(DEPARTURE_NUMBER, 1, BARCODE)

    expect(mocks.undoDepartureAssetLoad).toHaveBeenCalledWith(DEPARTURE_NUMBER, 1)
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith([BARCODE])
    expect(mocks.invalidateSearchOnHand).toHaveBeenCalledOnce()
    expect(mocks.invalidateHoldLists).toHaveBeenCalledOnce()
  })
})
