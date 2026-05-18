import { createHold, getHoldForUpdate, getHolds, patchHoldAssets, updateHold } from '@/data/api/hold-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { holdDetailKey } from '@/hooks/use-hold-detail'
import { mergeAssets } from '@/lib/collection-utils'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { AssetSummary, HoldDetail, HoldSummary, User } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(holdNumber: string, assetId: number): string {
  return `${holdNumber}:${assetId}`
}

interface HoldStore {
  holds: HoldSummary[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  holdBy: SelectOption<User>
  holdFor: SelectOption<User>
  hasSearched: boolean
  holdFormData: HoldForm | null

  setHolds: (holds: HoldSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHoldBy: (v: SelectOption<User>) => void
  setHoldFor: (v: SelectOption<User>) => void
  setHasSearched: (hasSearched: boolean) => void
  getHolds: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    holdBy: SelectOption<User>,
    holdFor: SelectOption<User>) => Promise<void>
  getHoldForUpdate: (holdNumber: string) => Promise<void>
  submitCreateHold: (data: HoldForm) => Promise<{ holdNumber: string }>
  submitUpdateHold: (holdNumber: string, data: HoldForm) => Promise<{ holdNumber: string }>
  addAssets: (holdNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  getAssets: (holdNumber: string) => Promise<AssetSummary[]>
  removeAssetFromHold: (holdNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromHold: (holdNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (holdNumber: string) => void
  clearHolds: () => void
}

export const useHoldStore = create<HoldStore>((set) => ({
  holds: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  holdBy: ANY_OPTION,
  holdFor: ANY_OPTION,
  hasSearched: false,
  holdFormData: null,

  setHolds: (holds) => set({ holds }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHoldBy: (holdBy) => set({ holdBy }),
  setHoldFor: (holdFor) => set({ holdFor }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  getHolds: async (fromDate, toDate, holdBy, holdFor) => {
    set({ hasSearched: true, holds: await getHolds(fromDate, toDate, holdBy, holdFor) })
  },
  getHoldForUpdate: async (holdNumber) => {
    set({ holdFormData: null })
    set({ holdFormData: await getHoldForUpdate(holdNumber) })
  },
  submitCreateHold: async (data) => {
    const result = await createHold(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    set({ hasSearched: false })
    return result
  },
  submitUpdateHold: async (holdNumber, data) => {
    const previousAssets = useHoldStore.getState().holdFormData?.assets ?? []
    const affected = new Set<string>()
    for (const a of previousAssets) affected.add(a.barcode)
    for (const a of data.assets) affected.add(a.barcode)
    const result = await updateHold(holdNumber, data)
    mutate(holdDetailKey(holdNumber))
    invalidateAssetDetails([...affected])
    return result
  },
  addAssets: async (holdNumber, assets) => {
    const form = await getHoldForUpdate(holdNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateHold(holdNumber, { ...form, assets: merged })
    mutate(holdDetailKey(holdNumber))
    invalidateAssetDetails(assets.map(a => a.barcode))
    return { added, skipped }
  },
  getAssets: async (holdNumber) => {
    const form = await getHoldForUpdate(holdNumber)
    return form?.assets ?? []
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
  clearHolds: () => set({ holds: [] })
}))
