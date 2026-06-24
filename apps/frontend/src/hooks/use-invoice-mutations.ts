import {
  createInvoice,
  getInvoiceDetail,
  patchInvoiceAssets,
  updateInvoiceMetadata,
} from '@/data/api/invoice-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invoiceDetailKey, invalidateInvoiceLists } from '@/hooks/use-invoice'
import {
  flushPendingRemovals,
  scheduleAssetRemoval,
  scheduleBulkAssetRemoval,
} from '@/lib/asset-removal-undo'
import type { InvoiceForm, InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import type { AssetSummary, InvoiceDetail } from 'shared-types'
import { mutate } from 'swr'

async function create(data: InvoiceForm) {
  const result = await createInvoice(data)
  invalidateAssetDetails(data.assets.map((a) => a.barcode))
  invalidateInvoiceLists()
  return result
}

async function getAssets(invoiceNumber: string): Promise<AssetSummary[]> {
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
  mutate<InvoiceDetail>(
    cacheKey,
    (current) => (current ? { ...current, assets: [...current.assets, asset] } : current),
    { revalidate: false },
  )
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

async function updateMetadata(invoiceNumber: string, metadata: InvoiceMetadataForm) {
  await updateInvoiceMetadata(invoiceNumber, metadata)
  mutate(invoiceDetailKey(invoiceNumber))
  invalidateInvoiceLists()
}

function removeAsset(invoiceNumber: string, asset: AssetSummary) {
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

function bulkRemoveAssets(invoiceNumber: string, assets: AssetSummary[]) {
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

const mutations = {
  create,
  getAssets,
  addAssets,
  addAsset,
  updateMetadata,
  removeAsset,
  bulkRemoveAssets,
  flushPending: flushPendingRemovals,
} as const

export function useInvoiceMutations() {
  return mutations
}
