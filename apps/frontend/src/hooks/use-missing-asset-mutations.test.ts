import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMissingAssetMutations } from './use-missing-asset-mutations'

const mocks = vi.hoisted(() => ({
  returnMissingAssetsToStock: vi.fn(),
  invalidateAssetDetails: vi.fn(),
  invalidateSearchMissing: vi.fn(),
  invalidateSearchOnHand: vi.fn(),
  invalidateTransferDetails: vi.fn(),
  invalidateTransferLists: vi.fn(),
}))

vi.mock('@/data/api/asset-api', () => ({
  returnMissingAssetsToStock: mocks.returnMissingAssetsToStock,
}))
vi.mock('@/hooks/use-asset-detail', () => ({
  invalidateAssetDetails: mocks.invalidateAssetDetails,
}))
vi.mock('@/hooks/use-search-missing', () => ({
  invalidateSearchMissing: mocks.invalidateSearchMissing,
}))
vi.mock('@/hooks/use-search-onhand', () => ({
  invalidateSearchOnHand: mocks.invalidateSearchOnHand,
}))
vi.mock('@/hooks/use-transfer', () => ({
  invalidateTransferDetails: mocks.invalidateTransferDetails,
  invalidateTransferLists: mocks.invalidateTransferLists,
}))

const ASSETS = [
  { id: 1, barcode: 'YYZ-0000001' },
  { id: 2, barcode: 'YYZ-0000002' },
]

describe('useMissingAssetMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the assets to stock, then refreshes assets, both lists and transfers', async () => {
    mocks.returnMissingAssetsToStock.mockResolvedValue(undefined)

    await useMissingAssetMutations().returnToStock(ASSETS)

    expect(mocks.returnMissingAssetsToStock).toHaveBeenCalledWith([1, 2])
    expect(mocks.invalidateAssetDetails).toHaveBeenCalledWith(['YYZ-0000001', 'YYZ-0000002'])
    expect(mocks.invalidateSearchMissing).toHaveBeenCalled()
    expect(mocks.invalidateSearchOnHand).toHaveBeenCalled()
    expect(mocks.invalidateTransferDetails).toHaveBeenCalled()
    expect(mocks.invalidateTransferLists).toHaveBeenCalled()
  })

  it('refreshes nothing when the server rejects the return', async () => {
    mocks.returnMissingAssetsToStock.mockRejectedValue(new Error('blocked'))

    await expect(useMissingAssetMutations().returnToStock(ASSETS)).rejects.toThrow('blocked')

    expect(mocks.invalidateSearchMissing).not.toHaveBeenCalled()
    expect(mocks.invalidateTransferDetails).not.toHaveBeenCalled()
  })
})
