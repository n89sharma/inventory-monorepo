import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { scheduleRemoval } from '@/lib/removal-undo'
import type { AssetDelta, AssetIdentity } from 'shared-types'

export { flushPendingRemovals } from '@/lib/removal-undo'

interface AssetRemovalSpec {
  collectionId: string
  detailCacheKey: string
  patchAssets: (delta: AssetDelta) => Promise<void>
  invalidateLists: () => void
}

interface HasAssets {
  assets: { id: number }[]
}

export function scheduleBulkAssetRemoval(spec: AssetRemovalSpec, assets: AssetIdentity[]): void {
  if (assets.length === 0) return
  const ids = assets.map((a) => a.id)
  const idSet = new Set(ids)
  const barcodes = assets.map((a) => a.barcode)

  scheduleRemoval<HasAssets>({
    collectionId: spec.collectionId,
    detailCacheKey: spec.detailCacheKey,
    hideRemoved: (current) => ({
      ...current,
      assets: current.assets.filter((a) => !idSet.has(a.id)),
    }),
    persist: async () => {
      await spec.patchAssets({ assetIdsToAdd: [], assetIdsToRemove: ids })
      invalidateAssetDetails(barcodes)
      spec.invalidateLists()
    },
    label: assets.length === 1 ? 'Removed 1 asset' : `Removed ${assets.length} assets`,
  })
}
