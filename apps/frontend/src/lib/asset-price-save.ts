import { patchAssetPricing } from '@/data/api/asset-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invalidateAssetHistory } from '@/hooks/use-asset-history'
import type { AssetCost, AssetSearchRow, PatchAssetPricing } from 'shared-types'
import { mutate } from 'swr'

export interface PriceSaveSpec {
  detailCacheKey: string
  invalidateLists: () => void
}

interface HasAssets {
  assets: AssetSearchRow[]
}

// The server recomputes every field, including the derived total, so the whole cost is
// spread back over the row rather than only the field that was patched.
function withCost(asset: AssetSearchRow, cost: AssetCost): AssetSearchRow {
  return {
    ...asset,
    cost_purchase_cost: cost.purchase_cost,
    cost_transport_cost: cost.transport_cost,
    cost_transfer_cost: cost.transfer_cost,
    cost_processing_cost: cost.processing_cost,
    cost_other_cost: cost.other_cost,
    cost_parts_cost: cost.parts_cost,
    cost_total_cost: cost.total_cost,
    cost_sale_price: cost.sale_price,
  }
}

// One patch per price field returns the recomputed cost for the whole asset, so two in-flight
// patches for the same barcode can resolve out of order and write a stale cost into the collection
// cache. Serialized per barcode across every table; different barcodes still overlap.
const priceSaveChains = new Map<string, Promise<unknown>>()

// Keyed by the SWR detail key so two collections edited in one session each keep their own
// deferred invalidation, and an arrival number can never consume an invoice's.
const pendingListInvalidations = new Set<string>()

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

// The response carries the server-recomputed cost, so the detail cache is patched in place rather
// than refetched — a blur on every cell would otherwise refetch the whole collection.
async function writePrice(spec: PriceSaveSpec, barcode: string, patch: PatchAssetPricing) {
  const cost = await patchAssetPricing(barcode, patch)
  invalidateAssetDetails([barcode])
  invalidateAssetHistory([barcode])
  await mutate<HasAssets>(
    spec.detailCacheKey,
    (current) =>
      current && {
        ...current,
        assets: current.assets.map((asset) =>
          asset.barcode === barcode ? withCost(asset, cost) : asset,
        ),
      },
    { revalidate: false },
  )
  // Deferred to flushPendingPriceInvalidation: tabbing across a 30-row table would otherwise
  // revalidate every cached list once per cell, and the on-page totals are summed from the
  // patched cache.
  pendingListInvalidations.add(spec.detailCacheKey)
}

export function saveAssetPrice(
  spec: PriceSaveSpec,
  barcode: string,
  patch: PatchAssetPricing,
): Promise<void> {
  return enqueuePriceSave(barcode, () => writePrice(spec, barcode, patch))
}

export function flushPendingPriceInvalidation(spec: PriceSaveSpec): void {
  if (!pendingListInvalidations.delete(spec.detailCacheKey)) return
  spec.invalidateLists()
}
