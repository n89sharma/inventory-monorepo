import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import type { AssetDelta, AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'

const UNDO_WINDOW_MS = 5000

type Pending = { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }
const pendingRemovals = new Map<string, Pending>()

interface RemovalSpec {
  collectionId: string
  detailCacheKey: string
  patchAssets: (delta: AssetDelta) => Promise<void>
  invalidateLists: () => void
}

interface HasAssets {
  assets: AssetSummary[]
}

function makeKey(collectionId: string, suffix: string): string {
  return `${collectionId}:${suffix}`
}

function buildUndo(key: string, detailCacheKey: string) {
  return () => {
    const pending = pendingRemovals.get(key)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingRemovals.delete(key)
    mutate(detailCacheKey)
  }
}

export function scheduleAssetRemoval(spec: RemovalSpec, asset: AssetSummary): void {
  const key = makeKey(spec.collectionId, String(asset.id))

  mutate<HasAssets>(
    spec.detailCacheKey,
    (current) =>
      current ? { ...current, assets: current.assets.filter((a) => a.id !== asset.id) } : current,
    { revalidate: false },
  )

  const commit = async () => {
    pendingRemovals.delete(key)
    try {
      await spec.patchAssets({ assetIdsToAdd: [], assetIdsToRemove: [asset.id] })
      invalidateAssetDetails([asset.barcode])
      spec.invalidateLists()
    } finally {
      mutate(spec.detailCacheKey)
    }
  }

  const timer = setTimeout(() => {
    void commit()
  }, UNDO_WINDOW_MS)
  pendingRemovals.set(key, { timer, commit })

  toast.success(`Asset ${asset.barcode} removed`, {
    position: 'top-center',
    duration: UNDO_WINDOW_MS,
    action: { label: 'Undo', onClick: buildUndo(key, spec.detailCacheKey) },
  })
}

export function scheduleBulkAssetRemoval(spec: RemovalSpec, assets: AssetSummary[]): void {
  if (assets.length === 0) return
  const ids = assets.map((a) => a.id)
  const idSet = new Set(ids)
  const barcodes = assets.map((a) => a.barcode)
  const key = makeKey(spec.collectionId, `bulk:${Date.now()}`)

  mutate<HasAssets>(
    spec.detailCacheKey,
    (current) =>
      current ? { ...current, assets: current.assets.filter((a) => !idSet.has(a.id)) } : current,
    { revalidate: false },
  )

  const commit = async () => {
    pendingRemovals.delete(key)
    try {
      await spec.patchAssets({ assetIdsToAdd: [], assetIdsToRemove: ids })
      invalidateAssetDetails(barcodes)
      spec.invalidateLists()
    } finally {
      mutate(spec.detailCacheKey)
    }
  }

  const timer = setTimeout(() => {
    void commit()
  }, UNDO_WINDOW_MS)
  pendingRemovals.set(key, { timer, commit })

  const label = assets.length === 1 ? 'Removed 1 asset' : `Removed ${assets.length} assets`
  toast.success(label, {
    position: 'top-center',
    duration: UNDO_WINDOW_MS,
    action: { label: 'Undo', onClick: buildUndo(key, spec.detailCacheKey) },
  })
}

export function flushPendingRemovals(collectionId: string): void {
  const prefix = `${collectionId}:`
  for (const [key, pending] of pendingRemovals) {
    if (!key.startsWith(prefix)) continue
    clearTimeout(pending.timer)
    // Intentional fire-and-forget: flush the pending commit without blocking unmount.
    // eslint-disable-next-line sonarjs/void-use
    void pending.commit()
  }
}
