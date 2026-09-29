import {
  completeDeparture,
  createDeparture,
  finishLoadingDeparture,
  getDepartureDetail,
  markDepartureAssetMissingAtLoad,
  patchDepartureAssets,
  returnDepartureAssetsToStock,
  scanDepartureAssetLoaded,
  scheduleDeparture,
  setDepartureOutgoingStatus,
  startLoadingDeparture,
  undoDepartureAssetLoad,
  updateDepartureDate,
  updateDepartureMetadata,
  updateDepartureNotes,
} from '@/data/api/departure-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { departureDetailKey, invalidateDepartureLists } from '@/hooks/use-departure'
import { invalidateHoldLists } from '@/hooks/use-hold'
import { invalidateInvoiceLists } from '@/hooks/use-invoice'
import { invalidateSearchMissing } from '@/hooks/use-search-missing'
import { invalidateSearchOnHand } from '@/hooks/use-search-onhand'
import {
  flushPendingPriceInvalidation,
  saveAssetPrice,
  type PriceSaveSpec,
} from '@/lib/asset-price-save'
import { flushPendingRemovals, scheduleBulkAssetRemoval } from '@/lib/asset-removal-undo'
import type { DepartureForm, DepartureMetadataForm } from '@/ui-types/departure-form-types'
import type {
  AssetIdentity,
  AssetSearchRow,
  AssetSummary,
  OutgoingStatus,
  PatchAssetPricing,
} from 'shared-types'
import { mutate } from 'swr'

async function create(data: DepartureForm) {
  const result = await createDeparture(data)
  invalidateAssetDetails(data.assets.map((a) => a.barcode))
  invalidateDepartureLists()
  return result
}

async function getAssets(departureNumber: string): Promise<AssetSearchRow[]> {
  return (await getDepartureDetail(departureNumber)).assets
}

async function addAssets(departureNumber: string, assets: AssetSummary[]) {
  const existing = (await getDepartureDetail(departureNumber)).assets
  const existingIds = new Set(existing.map((a) => a.id))
  const newOnly = assets.filter((a) => !existingIds.has(a.id))
  const added = newOnly.length
  const skipped = assets.length - added
  if (added > 0) {
    await patchDepartureAssets(departureNumber, {
      assetIdsToAdd: newOnly.map((a) => a.id),
      assetIdsToRemove: [],
    })
    mutate(departureDetailKey(departureNumber))
    invalidateAssetDetails(newOnly.map((a) => a.barcode))
    invalidateDepartureLists()
  }
  return { added, skipped }
}

async function addAsset(departureNumber: string, asset: AssetSummary) {
  const cacheKey = departureDetailKey(departureNumber)
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
  const ids = assets.map((a) => a.id)
  const barcodes = assets.map((a) => a.barcode)
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

async function updateDate(departureNumber: string, departureDate: string) {
  await updateDepartureDate(departureNumber, departureDate)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

async function updateNotes(departureNumber: string, comment: string) {
  await updateDepartureNotes(departureNumber, comment)
  mutate(departureDetailKey(departureNumber))
}

async function schedule(departureNumber: string, departureDate: string) {
  await scheduleDeparture(departureNumber, departureDate)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

async function startLoading(departureNumber: string) {
  await startLoadingDeparture(departureNumber)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

async function finishLoading(departureNumber: string) {
  await finishLoadingDeparture(departureNumber)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

async function complete(departureNumber: string) {
  await completeDeparture(departureNumber)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

// Loading changes an asset's status and can release its hold, so the stock and hold views refresh too.
function refreshAfterLoadChange(departureNumber: string, barcode: string) {
  mutate(departureDetailKey(departureNumber))
  invalidateAssetDetails([barcode])
  invalidateDepartureLists()
  invalidateSearchOnHand()
  invalidateHoldLists()
}

async function scanLoaded(departureNumber: string, assetId: number, barcode: string) {
  await scanDepartureAssetLoaded(departureNumber, assetId)
  refreshAfterLoadChange(departureNumber, barcode)
}

async function markMissingAtLoad(departureNumber: string, assetId: number, barcode: string) {
  await markDepartureAssetMissingAtLoad(departureNumber, assetId)
  refreshAfterLoadChange(departureNumber, barcode)
  invalidateSearchMissing()
}

async function undoLoad(departureNumber: string, assetId: number, barcode: string) {
  await undoDepartureAssetLoad(departureNumber, assetId)
  refreshAfterLoadChange(departureNumber, barcode)
}

function bulkRemoveAssets(departureNumber: string, assets: AssetIdentity[]) {
  scheduleBulkAssetRemoval(
    {
      collectionId: departureNumber,
      detailCacheKey: departureDetailKey(departureNumber),
      patchAssets: (delta) => patchDepartureAssets(departureNumber, delta),
      invalidateLists: invalidateDepartureLists,
    },
    assets,
  )
}

async function setOutgoingStatus(
  departureNumber: string,
  assetIds: number[],
  status: OutgoingStatus,
) {
  if (assetIds.length === 0) return
  await setDepartureOutgoingStatus(departureNumber, assetIds, status)
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
}

async function returnToStock(departureNumber: string, assets: { id: number; barcode: string }[]) {
  if (assets.length === 0) return
  await returnDepartureAssetsToStock(
    departureNumber,
    assets.map((a) => a.id),
  )
  mutate(departureDetailKey(departureNumber))
  invalidateDepartureLists()
  invalidateInvoiceLists()
  invalidateAssetDetails(assets.map((a) => a.barcode))
}

function priceSaveSpec(departureNumber: string): PriceSaveSpec {
  return {
    detailCacheKey: departureDetailKey(departureNumber),
    invalidateLists: invalidateDepartureLists,
  }
}

function updatePrice(
  departureNumber: string,
  barcode: string,
  patch: PatchAssetPricing,
): Promise<void> {
  return saveAssetPrice(priceSaveSpec(departureNumber), barcode, patch)
}

// Draft removals are deferred behind an undo window, and price edits defer their list
// invalidation. Module-level so the identity stays stable: CollectionDetailPage's unmount effect
// depends on this callback and would otherwise flush on every render.
function flushPending(departureNumber: string) {
  flushPendingRemovals(departureNumber)
  flushPendingPriceInvalidation(priceSaveSpec(departureNumber))
}

const mutations = {
  create,
  getAssets,
  addAssets,
  addAsset,
  addAssetBatch,
  updateMetadata,
  updateDate,
  updateNotes,
  schedule,
  startLoading,
  finishLoading,
  complete,
  scanLoaded,
  markMissingAtLoad,
  undoLoad,
  bulkRemoveAssets,
  updatePrice,
  setOutgoingStatus,
  returnToStock,
  flushPending,
} as const

export function useDepartureMutations() {
  return mutations
}
