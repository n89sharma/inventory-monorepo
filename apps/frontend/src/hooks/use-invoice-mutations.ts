import {
  createInvoice,
  deleteInvoice,
  getInvoiceDetail,
  patchInvoiceAssets,
  updateInvoiceMetadata,
} from '@/data/api/invoice-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invoiceDetailKey, clearInvoiceDetail, invalidateInvoiceLists } from '@/hooks/use-invoice'
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
import type { InvoiceForm, InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import type { AssetIdentity, AssetSearchRow, AssetSummary, PatchAssetPricing } from 'shared-types'
import { mutate } from 'swr'

async function create(data: InvoiceForm) {
  const result = await createInvoice(data)
  invalidateAssetDetails(data.assets.map((a) => a.barcode))
  invalidateInvoiceLists()
  return result
}

async function getAssets(invoiceNumber: string): Promise<AssetSearchRow[]> {
  return (await getInvoiceDetail(invoiceNumber)).assets
}

async function addAssets(invoiceNumber: string, assets: AssetSummary[]) {
  const existing = (await getInvoiceDetail(invoiceNumber)).assets
  const existingIds = new Set(existing.map((a) => a.id))
  const newOnly = assets.filter((a) => !existingIds.has(a.id))
  const added = newOnly.length
  const skipped = assets.length - added
  if (added > 0) {
    await patchInvoiceAssets(invoiceNumber, {
      assetIdsToAdd: newOnly.map((a) => a.id),
      assetIdsToRemove: [],
    })
    mutate(invoiceDetailKey(invoiceNumber))
    invalidateAssetDetails(newOnly.map((a) => a.barcode))
    invalidateInvoiceLists()
  }
  return { added, skipped }
}

async function addAsset(invoiceNumber: string, asset: AssetSummary) {
  const cacheKey = invoiceDetailKey(invoiceNumber)
  try {
    await patchInvoiceAssets(invoiceNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
    invalidateAssetDetails([asset.barcode])
    invalidateInvoiceLists()
  } catch (err) {
    mutate(cacheKey)
    throw err
  } finally {
    mutate(cacheKey)
  }
}

function priceSaveSpec(invoiceNumber: string): PriceSaveSpec {
  return {
    detailCacheKey: invoiceDetailKey(invoiceNumber),
    invalidateLists: invalidateInvoiceLists,
  }
}

function updatePrice(
  invoiceNumber: string,
  barcode: string,
  patch: PatchAssetPricing,
): Promise<void> {
  return saveAssetPrice(priceSaveSpec(invoiceNumber), barcode, patch)
}

async function updateMetadata(invoiceNumber: string, metadata: InvoiceMetadataForm) {
  await updateInvoiceMetadata(invoiceNumber, metadata)
  mutate(invoiceDetailKey(invoiceNumber))
  invalidateInvoiceLists()
}

function removeAsset(invoiceNumber: string, asset: AssetIdentity) {
  scheduleAssetRemoval(
    {
      collectionId: invoiceNumber,
      detailCacheKey: invoiceDetailKey(invoiceNumber),
      patchAssets: (delta) => patchInvoiceAssets(invoiceNumber, delta),
      invalidateLists: invalidateInvoiceLists,
    },
    asset,
  )
}

function bulkRemoveAssets(invoiceNumber: string, assets: AssetIdentity[]) {
  scheduleBulkAssetRemoval(
    {
      collectionId: invoiceNumber,
      detailCacheKey: invoiceDetailKey(invoiceNumber),
      patchAssets: (delta) => patchInvoiceAssets(invoiceNumber, delta),
      invalidateLists: invalidateInvoiceLists,
    },
    assets,
  )
}

// Module-level so the identity stays stable: CollectionDetailPage's unmount effect depends on
// this callback and would otherwise flush on every render.
function flushPending(invoiceNumber: string) {
  flushPendingRemovals(invoiceNumber)
  flushPendingPriceInvalidation(priceSaveSpec(invoiceNumber))
}

async function remove(invoiceNumber: string) {
  await deleteInvoice(invoiceNumber)
  clearInvoiceDetail(invoiceNumber)
  invalidateInvoiceLists()
}

const mutations = {
  create,
  remove,
  getAssets,
  addAssets,
  addAsset,
  updatePrice,
  updateMetadata,
  removeAsset,
  bulkRemoveAssets,
  flushPending,
} as const

export function useInvoiceMutations() {
  return mutations
}
