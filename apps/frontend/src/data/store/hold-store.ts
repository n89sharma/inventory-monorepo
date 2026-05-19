import { createHold, getHoldDetail, patchHoldAssets, updateHoldMetadata as updateHoldMetadataApi } from '@/data/api/hold-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { holdDetailKey } from '@/hooks/use-hold-detail'
import { invalidateHoldLists } from '@/hooks/use-holds-list'
import type { HoldForm, HoldMetadataForm } from '@/ui-types/hold-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { AssetSummary, HoldDetail, User } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(holdNumber: string, assetId: number): string {
  return `${holdNumber}:${assetId}`
}

interface HoldStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  holdBy: SelectOption<User>
  holdFor: SelectOption<User>
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHoldBy: (v: SelectOption<User>) => void
  setHoldFor: (v: SelectOption<User>) => void
  setHasSearched: (hasSearched: boolean) => void
  submitCreateHold: (data: HoldForm) => Promise<{ holdNumber: string }>
  getAssets: (holdNumber: string) => Promise<AssetSummary[]>
  addAssets: (holdNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  addAssetToHold: (holdNumber: string, asset: AssetSummary) => Promise<void>
  updateHoldMetadata: (holdNumber: string, metadata: HoldMetadataForm) => Promise<void>
  removeAssetFromHold: (holdNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromHold: (holdNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (holdNumber: string) => void
}

export const useHoldStore = create<HoldStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  holdBy: ANY_OPTION,
  holdFor: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHoldBy: (holdBy) => set({ holdBy }),
  setHoldFor: (holdFor) => set({ holdFor }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  submitCreateHold: async (data) => {
    const result = await createHold(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    invalidateHoldLists()
    return result
  },
  updateHoldMetadata: async (holdNumber, metadata) => {
    await updateHoldMetadataApi(holdNumber, metadata)
    mutate(holdDetailKey(holdNumber))
    invalidateHoldLists()
  },
  getAssets: async (holdNumber) => {
    return (await getHoldDetail(holdNumber)).assets
  },
  addAssets: async (holdNumber, assets) => {
    const existing = (await getHoldDetail(holdNumber)).assets
    const existingIds = new Set(existing.map(a => a.id))
    const newOnly = assets.filter(a => !existingIds.has(a.id))
    const added = newOnly.length
    const skipped = assets.length - added
    if (added > 0) {
      await patchHoldAssets(holdNumber, { assetIdsToAdd: newOnly.map(a => a.id), assetIdsToRemove: [] })
      mutate(holdDetailKey(holdNumber))
      invalidateAssetDetails(newOnly.map(a => a.barcode))
      invalidateHoldLists()
    }
    return { added, skipped }
  },
  addAssetToHold: async (holdNumber, asset) => {
    const cacheKey = holdDetailKey(holdNumber)
    mutate<HoldDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, asset] } : current,
      { revalidate: false }
    )
    try {
      await patchHoldAssets(holdNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
      invalidateAssetDetails([asset.barcode])
      invalidateHoldLists()
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
  },
  removeAssetFromHold: (holdNumber, asset) => {
    const key = pendingKey(holdNumber, asset.id)
    const cacheKey = holdDetailKey(holdNumber)

    mutate<HoldDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => a.id !== asset.id) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchHoldAssets(holdNumber, { assetIdsToAdd: [], assetIdsToRemove: [asset.id] })
        invalidateAssetDetails([asset.barcode])
        invalidateHoldLists()
      } finally {
        mutate(cacheKey)
      }
    }

    const undo = () => {
      const pending = pendingRemovals.get(key)
      if (!pending) return
      clearTimeout(pending.timer)
      pendingRemovals.delete(key)
      mutate(cacheKey)
    }

    const timer = setTimeout(() => { void commit() }, UNDO_WINDOW_MS)
    pendingRemovals.set(key, { timer, commit })

    toast.success(`Asset ${asset.barcode} removed`, {
      position: 'top-center',
      duration: UNDO_WINDOW_MS,
      action: { label: 'Undo', onClick: undo }
    })
  },
  bulkRemoveAssetsFromHold: (holdNumber, assets) => {
    if (assets.length === 0) return
    const ids = assets.map(a => a.id)
    const idSet = new Set(ids)
    const barcodes = assets.map(a => a.barcode)
    const key = `${holdNumber}:bulk:${Date.now()}`
    const cacheKey = holdDetailKey(holdNumber)

    mutate<HoldDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => !idSet.has(a.id)) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchHoldAssets(holdNumber, { assetIdsToAdd: [], assetIdsToRemove: ids })
        invalidateAssetDetails(barcodes)
        invalidateHoldLists()
      } finally {
        mutate(cacheKey)
      }
    }

    const undo = () => {
      const pending = pendingRemovals.get(key)
      if (!pending) return
      clearTimeout(pending.timer)
      pendingRemovals.delete(key)
      mutate(cacheKey)
    }

    const timer = setTimeout(() => { void commit() }, UNDO_WINDOW_MS)
    pendingRemovals.set(key, { timer, commit })

    const label = assets.length === 1 ? 'Removed 1 asset' : `Removed ${assets.length} assets`
    toast.success(label, {
      position: 'top-center',
      duration: UNDO_WINDOW_MS,
      action: { label: 'Undo', onClick: undo }
    })
  },
  flushPendingRemovals: (holdNumber) => {
    const prefix = `${holdNumber}:`
    for (const [key, pending] of pendingRemovals) {
      if (!key.startsWith(prefix)) continue
      clearTimeout(pending.timer)
      void pending.commit()
    }
  },
}))
