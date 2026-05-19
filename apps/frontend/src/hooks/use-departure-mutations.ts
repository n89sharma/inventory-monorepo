import { createDeparture, getDepartureDetail, patchDepartureAssets, updateDepartureMetadata } from '@/data/api/departure-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { departureDetailKey, invalidateDepartureLists } from '@/hooks/use-departure'
import { flushPendingRemovals, scheduleAssetRemoval, scheduleBulkAssetRemoval } from '@/lib/asset-removal-undo'
import type { DepartureForm, DepartureMetadataForm } from '@/ui-types/departure-form-types'
import type { AssetSummary, DepartureDetail } from 'shared-types'
import { mutate } from 'swr'

async function create(data: DepartureForm) {
  const result = await createDeparture(data)
  invalidateAssetDetails(data.assets.map(a => a.barcode))
  invalidateDepartureLists()
  return result
}

async function getAssets(departureNumber: string): Promise<AssetSummary[]> {
  return (await getDepartureDetail(departureNumber)).assets
}

async function addAssets(departureNumber: string, assets: AssetSummary[]) {
  const existing = (await getDepartureDetail(departureNumber)).assets
  const existingIds = new Set(existing.map(a => a.id))
  const newOnly = assets.filter(a => !existingIds.has(a.id))
  const added = newOnly.length
  const skipped = assets.length - added
  if (added > 0) {
    await patchDepartureAssets(departureNumber, { assetIdsToAdd: newOnly.map(a => a.id), assetIdsToRemove: [] })
    mutate(departureDetailKey(departureNumber))
    invalidateAssetDetails(newOnly.map(a => a.barcode))
    invalidateDepartureLists()
  }
  return { added, skipped }
}

async function addAsset(departureNumber: string, asset: AssetSummary) {
  const cacheKey = departureDetailKey(departureNumber)
  mutate<DepartureDetail>(
    cacheKey,
    current => current ? { ...current, assets: [...current.assets, asset] } : current,
    { revalidate: false }
  )
  try {
    await patchDepartureAssets(departureNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
    invalidateAssetDetails([asset.barcode])
    invalidateDepartureLists()
  } catch (err) {
    mutate(cacheKey)
    throw err
  } finally {
    mutate(cacheKey)
  }
}

async function addAssetBatch(departureNumber: string, assets: AssetSummary[]) {
  if (assets.length === 0) return
  const cacheKey = departureDetailKey(departureNumber)
  const ids = assets.map(a => a.id)
  const barcodes = assets.map(a => a.barcode)
  mutate<DepartureDetail>(
    cacheKey,
    current => current ? { ...current, assets: [...current.assets, ...assets] } : current,
    { revalidate: false }
  )
  try {
    await patchDepartureAssets(departureNumber, { assetIdsToAdd: ids, assetIdsToRemove: [] })
    invalidateAssetDetails(barcodes)
    invalidateDepartureLists()
  } catch (err) {
    mutate(cacheKey)
    throw err
  } finally {
    mutate(cacheKey)
  }
}

async function updateMetadata(departureNumber: string, metadata: DepartureMetadataForm) {
  await updateDepartureMetadata(departureNumber, metadata)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

function removeAsset(departureNumber: string, asset: AssetSummary) {
  scheduleAssetRemoval({
    collectionId: departureNumber,
    detailCacheKey: departureDetailKey(departureNumber),
    patchAssets: delta => patchDepartureAssets(departureNumber, delta),
    invalidateLists: invalidateDepartureLists,
  }, asset)
}

function bulkRemoveAssets(departureNumber: string, assets: AssetSummary[]) {
  scheduleBulkAssetRemoval({
    collectionId: departureNumber,
    detailCacheKey: departureDetailKey(departureNumber),
    patchAssets: delta => patchDepartureAssets(departureNumber, delta),
    invalidateLists: invalidateDepartureLists,
  }, assets)
}

const mutations = {
  create,
  getAssets,
  addAssets,
  addAsset,
  addAssetBatch,
  updateMetadata,
  removeAsset,
  bulkRemoveAssets,
  flushPending: flushPendingRemovals,
} as const

export function useDepartureMutations() {
  return mutations
}
