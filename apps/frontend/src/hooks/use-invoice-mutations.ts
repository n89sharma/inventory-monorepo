import {
  createInvoice,
  getInvoiceDetail,
  patchInvoiceAssets,
  updateInvoiceMetadata,
} from '@/data/api/invoice-api'
import { patchAssetPricing } from '@/data/api/asset-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invalidateAssetHistory } from '@/hooks/use-asset-history'
import { invoiceDetailKey, invalidateInvoiceLists } from '@/hooks/use-invoice'
import {
  flushPendingRemovals,
  scheduleAssetRemoval,
  scheduleBulkAssetRemoval,
} from '@/lib/asset-removal-undo'
import type { InvoiceForm, InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import type { AssetSummary, InvoiceDetail, PatchAssetPricing } from 'shared-types'
import { mutate } from 'swr'

let hasPendingInvoiceListInvalidation = false

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

// One patch per price field returns the recomputed cost for the whole asset, so two in-flight
// patches for the same barcode can resolve out of order and write a stale cost into the invoice
// cache. Serialized per barcode; different barcodes still overlap.
const priceSaveChains = new Map<string, Promise<unknown>>()

function enqueuePriceSave<T>(barcode: string, save: () => Promise<T>): Promise<T> {
  const previous = priceSaveChains.get(barcode) ?? Promise.resolve()
  // `save` as both handlers so a rejected save does not poison the rest of the chain.
  const result = previous.then(save, save)
  // The chain head swallows the rejection, so it reaches only this call's caller and never
  // surfaces as an unhandled rejection.
  const settled = result.then(pruneChain, pruneChain)
  priceSaveChains.set(barcode, settled)
  return result

  function pruneChain() {
    if (priceSaveChains.get(barcode) === settled) priceSaveChains.delete(barcode)
  }
}

// The response carries the server-recomputed cost, so the invoice cache is patched in
// place rather than refetched — a blur on every cell would otherwise refetch the invoice.
async function writePrice(invoiceNumber: string, barcode: string, patch: PatchAssetPricing) {
  const cost = await patchAssetPricing(barcode, patch)
  invalidateAssetDetails([barcode])
  invalidateAssetHistory([barcode])
  await mutate<InvoiceDetail>(
    invoiceDetailKey(invoiceNumber),
    (current) =>
      current && {
        ...current,
        assets: current.assets.map((asset) =>
          asset.barcode === barcode ? { ...asset, cost } : asset,
        ),
      },
    { revalidate: false },
  )
  // Deferred to flushPending: tabbing across a 30-row invoice would otherwise revalidate every
  // cached invoice list once per cell, and the on-page totals are summed from the patched cache.
  hasPendingInvoiceListInvalidation = true
}

function updatePrice(
  invoiceNumber: string,
  barcode: string,
  patch: PatchAssetPricing,
): Promise<void> {
  return enqueuePriceSave(barcode, () => writePrice(invoiceNumber, barcode, patch))
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

// Module-level so the identity stays stable: CollectionDetailPage's unmount effect depends on
// this callback and would otherwise flush on every render.
function flushPending(invoiceNumber: string) {
  flushPendingRemovals(invoiceNumber)
  if (!hasPendingInvoiceListInvalidation) return
  hasPendingInvoiceListInvalidation = false
  invalidateInvoiceLists()
}

const mutations = {
  create,
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
