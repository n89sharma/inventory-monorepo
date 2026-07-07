import {
  createArrival,
  createSingleArrivalAsset,
  getArrivalAssetForUpdate,
  patchArrivalAssets,
  updateArrivalAsset,
  updateArrivalMetadata,
} from '@/data/api/arrival-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { arrivalDetailKey, invalidateArrivalLists } from '@/hooks/use-arrival'
import {
  flushPendingRemovals,
  scheduleAssetRemoval,
  scheduleBulkAssetRemoval,
} from '@/lib/asset-removal-undo'
import type { ArrivalForm, ArrivalMetadataForm, AssetForm } from '@/ui-types/arrival-form-types'
import type { ArrivalDetail, AssetSummary } from 'shared-types'
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

const mutations = {
  create,
  updateMetadata,
  createAsset,
  getAssetForEdit,
  updateAsset,
  removeAsset,
  bulkRemoveAssets,
  flushPending: flushPendingRemovals,
} as const

export function useArrivalMutations() {
  return mutations
}
