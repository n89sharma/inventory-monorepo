import {
  createArrival,
  createSingleArrivalAsset,
  deleteArrival,
  getArrivalAssetForUpdate,
  moveArrivalAssets,
  patchArrivalAssets,
  updateArrivalAsset,
  updateArrivalMetadata,
} from '@/data/api/arrival-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { arrivalDetailKey, clearArrivalDetail, invalidateArrivalLists } from '@/hooks/use-arrival'
import {
  flushPendingPriceInvalidation,
  saveAssetPrice,
  type PriceSaveSpec,
} from '@/lib/asset-price-save'
import {
  flushPendingRemovals,
  scheduleAssetRemoval,
  scheduleBulkAssetRemoval,
} from '@/lib/asset-removal-undo'
import type { ArrivalForm, ArrivalMetadataForm, AssetForm } from '@/ui-types/arrival-form-types'
import type { ArrivalDetail, AssetSummary, PatchAssetPricing } from 'shared-types'
import { mutate } from 'swr'

async function create(data: ArrivalForm) {
  const result = await createArrival(data)
  invalidateArrivalLists()
  return result
}

async function updateMetadata(arrivalNumber: string, metadata: ArrivalMetadataForm) {
  await updateArrivalMetadata(arrivalNumber, metadata)
  mutate(arrivalDetailKey(arrivalNumber))
  invalidateArrivalLists()
}

async function createAsset(arrivalNumber: string, asset: AssetForm) {
  const cacheKey = arrivalDetailKey(arrivalNumber)
  const created = await createSingleArrivalAsset(arrivalNumber, asset)
  mutate<ArrivalDetail>(
    cacheKey,
    (current) => (current ? { ...current, assets: [...current.assets, created] } : current),
    { revalidate: false },
  )
  invalidateAssetDetails([created.barcode])
  invalidateArrivalLists()
  mutate(cacheKey)
  return created
}

async function getAssetForEdit(arrivalNumber: string, assetId: number): Promise<AssetForm> {
  return getArrivalAssetForUpdate(arrivalNumber, assetId)
}

async function updateAsset(arrivalNumber: string, assetId: number, asset: AssetForm) {
  const cacheKey = arrivalDetailKey(arrivalNumber)
  const updated = await updateArrivalAsset(arrivalNumber, assetId, asset)
  mutate<ArrivalDetail>(
    cacheKey,
    (current) =>
      current
        ? { ...current, assets: current.assets.map((a) => (a.id === assetId ? updated : a)) }
        : current,
    { revalidate: false },
  )
  invalidateAssetDetails([updated.barcode])
  mutate(cacheKey)
}

function removeAsset(arrivalNumber: string, asset: AssetSummary) {
  scheduleAssetRemoval(
    {
      collectionId: arrivalNumber,
      detailCacheKey: arrivalDetailKey(arrivalNumber),
      patchAssets: (delta) => patchArrivalAssets(arrivalNumber, delta),
      invalidateLists: invalidateArrivalLists,
    },
    asset,
  )
}

function bulkRemoveAssets(arrivalNumber: string, assets: AssetSummary[]) {
  scheduleBulkAssetRemoval(
    {
      collectionId: arrivalNumber,
      detailCacheKey: arrivalDetailKey(arrivalNumber),
      patchAssets: (delta) => patchArrivalAssets(arrivalNumber, delta),
      invalidateLists: invalidateArrivalLists,
    },
    assets,
  )
}

function priceSaveSpec(arrivalNumber: string): PriceSaveSpec {
  return {
    detailCacheKey: arrivalDetailKey(arrivalNumber),
    invalidateLists: invalidateArrivalLists,
  }
}

function updatePrice(
  arrivalNumber: string,
  barcode: string,
  patch: PatchAssetPricing,
): Promise<void> {
  return saveAssetPrice(priceSaveSpec(arrivalNumber), barcode, patch)
}

// Module-level so the identity stays stable: CollectionDetailPage's unmount effect depends on
// this callback and would otherwise flush on every render.
function flushPending(arrivalNumber: string) {
  flushPendingRemovals(arrivalNumber)
  flushPendingPriceInvalidation(priceSaveSpec(arrivalNumber))
}

async function moveAssets(
  sourceArrivalNumber: string,
  destinationArrivalNumber: string,
  assets: AssetSummary[],
) {
  await moveArrivalAssets(destinationArrivalNumber, {
    sourceArrivalNumber,
    assetIds: assets.map((a) => a.id),
  })
  mutate(arrivalDetailKey(sourceArrivalNumber))
  mutate(arrivalDetailKey(destinationArrivalNumber))
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateArrivalLists()
}

async function remove(arrivalNumber: string) {
  await deleteArrival(arrivalNumber)
  clearArrivalDetail(arrivalNumber)
  invalidateArrivalLists()
}

const mutations = {
  create,
  remove,
  updateMetadata,
  createAsset,
  getAssetForEdit,
  updateAsset,
  updatePrice,
  removeAsset,
  bulkRemoveAssets,
  moveAssets,
  flushPending,
} as const

export function useArrivalMutations() {
  return mutations
}
