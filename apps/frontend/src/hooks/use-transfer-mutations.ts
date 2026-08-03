import {
  createTransfer,
  deleteTransfer,
  dispatchTransfer,
  getTransferDetail,
  patchTransferAssets,
  receiveTransfer,
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
import {
  flushPendingRemovals,
  scheduleAssetRemoval,
  scheduleBulkAssetRemoval,
} from '@/lib/asset-removal-undo'
import type { TransferForm, TransferMetadataForm } from '@/ui-types/transfer-form-types'
import type { AssetSummary, PatchAssetPricing, TransferDetail } from 'shared-types'
import { mutate } from 'swr'

async function create(data: TransferForm) {
  const result = await createTransfer(data)
  invalidateAssetDetails(data.assets.map((a) => a.barcode))
  invalidateTransferLists()
  return result
}

async function getAssets(transferNumber: string): Promise<AssetSummary[]> {
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
  mutate<TransferDetail>(
    cacheKey,
    (current) => (current ? { ...current, assets: [...current.assets, asset] } : current),
    { revalidate: false },
  )
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
  mutate<TransferDetail>(
    cacheKey,
    (current) => (current ? { ...current, assets: [...current.assets, ...assets] } : current),
    { revalidate: false },
  )
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

async function dispatch(transferNumber: string, barcodes: string[]) {
  await dispatchTransfer(transferNumber)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails(barcodes)
  invalidateTransferLists()
}

async function receive(transferNumber: string, barcodes: string[]) {
  await receiveTransfer(transferNumber)
  mutate(transferDetailKey(transferNumber))
  invalidateAssetDetails(barcodes)
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

function removeAsset(transferNumber: string, asset: AssetSummary) {
  scheduleAssetRemoval(
    {
      collectionId: transferNumber,
      detailCacheKey: transferDetailKey(transferNumber),
      patchAssets: (delta) => patchTransferAssets(transferNumber, delta),
      invalidateLists: invalidateTransferLists,
    },
    asset,
  )
}

function bulkRemoveAssets(transferNumber: string, assets: AssetSummary[]) {
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
  dispatch,
  receive,
  updatePrice,
  removeAsset,
  bulkRemoveAssets,
  flushPending,
} as const

export function useTransferMutations() {
  return mutations
}
