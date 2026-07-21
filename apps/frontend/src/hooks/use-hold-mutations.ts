import {
  archiveHold,
  createHold,
  getHoldDetail,
  moveHoldAssets,
  patchHoldAssets,
  updateHoldMetadata,
} from '@/data/api/hold-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { holdDetailKey, invalidateHoldLists } from '@/hooks/use-hold'
import {
  flushPendingRemovals,
  scheduleAssetRemoval,
  scheduleBulkAssetRemoval,
} from '@/lib/asset-removal-undo'
import type { HoldForm, HoldMetadataForm } from '@/ui-types/hold-form-types'
import type { AssetSummary, HoldDetail } from 'shared-types'
import { mutate } from 'swr'

async function create(data: HoldForm) {
  const result = await createHold(data)
  invalidateAssetDetails(data.assets.map((a) => a.barcode))
  invalidateHoldLists()
  return result
}

async function getAssets(holdNumber: string): Promise<AssetSummary[]> {
  return (await getHoldDetail(holdNumber)).assets
}

async function addAssets(holdNumber: string, assets: AssetSummary[]) {
  const existing = (await getHoldDetail(holdNumber)).assets
  const existingIds = new Set(existing.map((a) => a.id))
  const newOnly = assets.filter((a) => !existingIds.has(a.id))
  const added = newOnly.length
  const skipped = assets.length - added
  if (added > 0) {
    await patchHoldAssets(holdNumber, {
      assetIdsToAdd: newOnly.map((a) => a.id),
      assetIdsToRemove: [],
    })
    mutate(holdDetailKey(holdNumber))
    invalidateAssetDetails(newOnly.map((a) => a.barcode))
    invalidateHoldLists()
  }
  return { added, skipped }
}

async function addAsset(holdNumber: string, asset: AssetSummary) {
  const cacheKey = holdDetailKey(holdNumber)
  mutate<HoldDetail>(
    cacheKey,
    (current) => (current ? { ...current, assets: [...current.assets, asset] } : current),
    { revalidate: false },
  )
  try {
    await patchHoldAssets(holdNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
    invalidateAssetDetails([asset.barcode])
    invalidateHoldLists()
  } catch (err) {
    mutate(cacheKey)
    throw err
  } finally {
    mutate(cacheKey)
  }
}

async function updateMetadata(holdNumber: string, metadata: HoldMetadataForm) {
  await updateHoldMetadata(holdNumber, metadata)
  mutate(holdDetailKey(holdNumber))
  invalidateHoldLists()
}

async function archive(holdNumber: string) {
  const releasedBarcodes = (await getHoldDetail(holdNumber)).assets.map((a) => a.barcode)
  await archiveHold(holdNumber)
  mutate(holdDetailKey(holdNumber))
  invalidateAssetDetails(releasedBarcodes)
  invalidateHoldLists()
}

function removeAsset(holdNumber: string, asset: AssetSummary) {
  scheduleAssetRemoval(
    {
      collectionId: holdNumber,
      detailCacheKey: holdDetailKey(holdNumber),
      patchAssets: (delta) => patchHoldAssets(holdNumber, delta),
      invalidateLists: invalidateHoldLists,
    },
    asset,
  )
}

async function moveAssets(
  sourceHoldNumber: string,
  destinationHoldNumber: string,
  assets: AssetSummary[],
) {
  await moveHoldAssets(destinationHoldNumber, {
    sourceHoldNumber,
    assetIds: assets.map((a) => a.id),
  })
  mutate(holdDetailKey(sourceHoldNumber))
  mutate(holdDetailKey(destinationHoldNumber))
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateHoldLists()
}

function bulkRemoveAssets(holdNumber: string, assets: AssetSummary[]) {
  scheduleBulkAssetRemoval(
    {
      collectionId: holdNumber,
      detailCacheKey: holdDetailKey(holdNumber),
      patchAssets: (delta) => patchHoldAssets(holdNumber, delta),
      invalidateLists: invalidateHoldLists,
    },
    assets,
  )
}

const mutations = {
  create,
  getAssets,
  addAssets,
  addAsset,
  updateMetadata,
  archive,
  removeAsset,
  bulkRemoveAssets,
  moveAssets,
  flushPending: flushPendingRemovals,
} as const

export function useHoldMutations() {
  return mutations
}
