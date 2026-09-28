import {
  completeTransfer,
  createTransfer,
  deleteTransfer,
  departTransfer,
  getTransferDetail,
  markTransferAssetMissingAtLoad,
  markTransferAssetMissingAtUnload,
  patchTransferAssets,
  returnTransferAssetsToOrigin,
  scanTransferAssetLoaded,
  scanTransferAssetUnloaded,
  scheduleTransfer,
  startLoadingTransfer,
  startUnloadingTransfer,
  undoTransferAssetLoad,
  undoTransferAssetUnload,
  updateTransferDate,
  updateTransferMetadata,
  updateTransferNotes,
} from '@/data/api/transfer-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import {
  transferDetailKey,
  clearTransferDetail,
  invalidateTransferLists,
} from '@/hooks/use-transfer'
import {
  flushPendingPriceInvalidation,
  saveAssetPrice,
  type PriceSaveSpec,
} from '@/lib/asset-price-save'
import { flushPendingRemovals, scheduleBulkAssetRemoval } from '@/lib/asset-removal-undo'
import type { TransferForm, TransferMetadataForm } from '@/ui-types/transfer-form-types'
import type {
  AssetIdentity,
  AssetSearchRow,
  AssetSummary,
  PatchAssetPricing,
  TransferCosts,
} from 'shared-types'
import { mutate } from 'swr'

async function create(data: TransferForm) {
  const result = await createTransfer(data)
  invalidateAssetDetails(data.assets.map((a) => a.barcode))
  invalidateTransferLists()
  return result
}

async function getAssets(transferNumber: string): Promise<AssetSearchRow[]> {
  return (await getTransferDetail(transferNumber)).assets
}

async function addAssets(transferNumber: string, assets: AssetSummary[]) {
  const existing = (await getTransferDetail(transferNumber)).assets
  const existingIds = new Set(existing.map((a) => a.id))
  const newOnly = assets.filter((a) => !existingIds.has(a.id))
  const added = newOnly.length
  const skipped = assets.length - added
  if (added > 0) {
    await patchTransferAssets(transferNumber, {
      assetIdsToAdd: newOnly.map((a) => a.id),
      assetIdsToRemove: [],
    })
    mutate(transferDetailKey(transferNumber))
    invalidateAssetDetails(newOnly.map((a) => a.barcode))
    invalidateTransferLists()
  }
  return { added, skipped }
}

async function addAsset(transferNumber: string, asset: AssetSummary) {
  const cacheKey = transferDetailKey(transferNumber)
  try {
    await patchTransferAssets(transferNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
    invalidateAssetDetails([asset.barcode])
    invalidateTransferLists()
  } catch (err) {
    mutate(cacheKey)
    throw err
  } finally {
    mutate(cacheKey)
  }
}

async function addAssetBatch(transferNumber: string, assets: AssetSummary[]) {
  if (assets.length === 0) return
  const cacheKey = transferDetailKey(transferNumber)
  const ids = assets.map((a) => a.id)
  const barcodes = assets.map((a) => a.barcode)
  try {
    await patchTransferAssets(transferNumber, { assetIdsToAdd: ids, assetIdsToRemove: [] })
    invalidateAssetDetails(barcodes)
    invalidateTransferLists()
  } catch (err) {
    mutate(cacheKey)
    throw err
  } finally {
    mutate(cacheKey)
  }
}

async function updateMetadata(transferNumber: string, metadata: TransferMetadataForm) {
  await updateTransferMetadata(transferNumber, metadata)
  mutate(transferDetailKey(transferNumber))
  invalidateTransferLists()
}

async function updateNotes(transferNumber: string, comment: string) {
  await updateTransferNotes(transferNumber, comment)
  mutate(transferDetailKey(transferNumber))
  invalidateTransferLists()
}

async function schedule(transferNumber: string, transferDate: string) {
  await scheduleTransfer(transferNumber, transferDate)
  mutate(transferDetailKey(transferNumber))
  invalidateTransferLists()
}

async function updateDate(transferNumber: string, transferDate: string) {
  await updateTransferDate(transferNumber, transferDate)
  mutate(transferDetailKey(transferNumber))
  invalidateTransferLists()
}

async function startLoading(transferNumber: string) {
  await startLoadingTransfer(transferNumber)
  mutate(transferDetailKey(transferNumber))
  invalidateTransferLists()
}

async function depart(transferNumber: string, barcodes: string[], costs: TransferCosts | null) {
  await departTransfer(transferNumber, costs)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails(barcodes)
  invalidateTransferLists()
}

async function startUnloading(transferNumber: string) {
  await startUnloadingTransfer(transferNumber)
  mutate(transferDetailKey(transferNumber))
  invalidateTransferLists()
}

async function complete(transferNumber: string, barcodes: string[]) {
  await completeTransfer(transferNumber)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails(barcodes)
  invalidateTransferLists()
}

async function scanLoaded(transferNumber: string, assetId: number, barcode: string) {
  await scanTransferAssetLoaded(transferNumber, assetId)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails([barcode])
  invalidateTransferLists()
}

async function scanUnloaded(transferNumber: string, assetId: number, barcode: string) {
  await scanTransferAssetUnloaded(transferNumber, assetId)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails([barcode])
  invalidateTransferLists()
}

async function markMissingAtLoad(transferNumber: string, assetId: number, barcode: string) {
  await markTransferAssetMissingAtLoad(transferNumber, assetId)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails([barcode])
  invalidateTransferLists()
}

async function markMissingAtUnload(transferNumber: string, assetId: number, barcode: string) {
  await markTransferAssetMissingAtUnload(transferNumber, assetId)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails([barcode])
  invalidateTransferLists()
}

async function undoLoad(transferNumber: string, assetId: number, barcode: string) {
  await undoTransferAssetLoad(transferNumber, assetId)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails([barcode])
  invalidateTransferLists()
}

async function undoUnload(transferNumber: string, assetId: number, barcode: string) {
  await undoTransferAssetUnload(transferNumber, assetId)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails([barcode])
  invalidateTransferLists()
}

async function returnToOrigin(transferNumber: string, assets: { id: number; barcode: string }[]) {
  if (assets.length === 0) return
  await returnTransferAssetsToOrigin(
    transferNumber,
    assets.map((a) => a.id),
  )
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateTransferLists()
}

function priceSaveSpec(transferNumber: string): PriceSaveSpec {
  return {
    detailCacheKey: transferDetailKey(transferNumber),
    invalidateLists: invalidateTransferLists,
  }
}

function updatePrice(
  transferNumber: string,
  barcode: string,
  patch: PatchAssetPricing,
): Promise<void> {
  return saveAssetPrice(priceSaveSpec(transferNumber), barcode, patch)
}

// Module-level so the identity stays stable: CollectionDetailPage's unmount effect depends on
// this callback and would otherwise flush on every render.
function flushPending(transferNumber: string) {
  flushPendingRemovals(transferNumber)
  flushPendingPriceInvalidation(priceSaveSpec(transferNumber))
}

function bulkRemoveAssets(transferNumber: string, assets: AssetIdentity[]) {
  scheduleBulkAssetRemoval(
    {
      collectionId: transferNumber,
      detailCacheKey: transferDetailKey(transferNumber),
      patchAssets: (delta) => patchTransferAssets(transferNumber, delta),
      invalidateLists: invalidateTransferLists,
    },
    assets,
  )
}

async function remove(transferNumber: string) {
  await deleteTransfer(transferNumber)
  clearTransferDetail(transferNumber)
  invalidateTransferLists()
}

const mutations = {
  create,
  remove,
  getAssets,
  addAssets,
  addAsset,
  addAssetBatch,
  updateMetadata,
  updateNotes,
  updateDate,
  schedule,
  startLoading,
  depart,
  startUnloading,
  complete,
  scanLoaded,
  scanUnloaded,
  markMissingAtLoad,
  markMissingAtUnload,
  undoLoad,
  undoUnload,
  returnToOrigin,
  updatePrice,
  bulkRemoveAssets,
  flushPending,
} as const

export function useTransferMutations() {
  return mutations
}
