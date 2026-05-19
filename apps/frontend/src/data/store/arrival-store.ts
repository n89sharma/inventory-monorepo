import { createArrival, createSingleArrivalAsset, getArrivalAssetForUpdate, patchArrivalAssets, updateArrivalAsset as updateArrivalAssetApi, updateArrivalMetadata as updateArrivalMetadataApi } from '@/data/api/arrival-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import type { ArrivalMetadataForm, AssetForm } from '@/ui-types/arrival-form-types'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ArrivalDetail, AssetSummary, Warehouse } from 'shared-types'
import { arrivalDetailKey } from '@/hooks/use-arrival-detail'
import { invalidateArrivalLists } from '@/hooks/use-arrivals-list'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(arrivalNumber: string, assetId: number): string {
  return `${arrivalNumber}:${assetId}`
}

interface ArrivalStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  destination: SelectOption<Warehouse>
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setHasSearched: (hasSearched: boolean) => void
  submitCreateArrival: (data: ArrivalForm) => Promise<{ arrivalNumber: string }>
  updateArrivalMetadata: (arrivalNumber: string, metadata: ArrivalMetadataForm) => Promise<void>
  createArrivalAsset: (arrivalNumber: string, asset: AssetForm) => Promise<void>
  getArrivalAssetForEdit: (arrivalNumber: string, assetId: number) => Promise<AssetForm>
  updateArrivalAsset: (arrivalNumber: string, assetId: number, asset: AssetForm) => Promise<void>
  removeAssetFromArrival: (arrivalNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromArrival: (arrivalNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (arrivalNumber: string) => void
}

export const useArrivalStore = create<ArrivalStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),

  submitCreateArrival: async (data: ArrivalForm) => {
    const result = await createArrival(data)
    invalidateArrivalLists()
    return result
  },
  updateArrivalMetadata: async (arrivalNumber, metadata) => {
    await updateArrivalMetadataApi(arrivalNumber, metadata)
    mutate(arrivalDetailKey(arrivalNumber))
    invalidateArrivalLists()
  },
  createArrivalAsset: async (arrivalNumber, asset) => {
    const cacheKey = arrivalDetailKey(arrivalNumber)
    const created = await createSingleArrivalAsset(arrivalNumber, asset)
    mutate<ArrivalDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, created] } : current,
      { revalidate: false }
    )
    invalidateAssetDetails([created.barcode])
    invalidateArrivalLists()
    mutate(cacheKey)
  },
  getArrivalAssetForEdit: async (arrivalNumber, assetId) => {
    return getArrivalAssetForUpdate(arrivalNumber, assetId)
  },
  updateArrivalAsset: async (arrivalNumber, assetId, asset) => {
    const cacheKey = arrivalDetailKey(arrivalNumber)
    const updated = await updateArrivalAssetApi(arrivalNumber, assetId, asset)
    mutate<ArrivalDetail>(
      cacheKey,
      current => current
        ? { ...current, assets: current.assets.map(a => a.id === assetId ? updated : a) }
        : current,
      { revalidate: false }
    )
    invalidateAssetDetails([updated.barcode])
    mutate(cacheKey)
  },
  removeAssetFromArrival: (arrivalNumber, asset) => {
    const key = pendingKey(arrivalNumber, asset.id)
    const cacheKey = arrivalDetailKey(arrivalNumber)

    mutate<ArrivalDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => a.id !== asset.id) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchArrivalAssets(arrivalNumber, { assetIdsToAdd: [], assetIdsToRemove: [asset.id] })
        invalidateAssetDetails([asset.barcode])
        invalidateArrivalLists()
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
  bulkRemoveAssetsFromArrival: (arrivalNumber, assets) => {
    if (assets.length === 0) return
    const ids = assets.map(a => a.id)
    const idSet = new Set(ids)
    const barcodes = assets.map(a => a.barcode)
    const key = `${arrivalNumber}:bulk:${Date.now()}`
    const cacheKey = arrivalDetailKey(arrivalNumber)

    mutate<ArrivalDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => !idSet.has(a.id)) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchArrivalAssets(arrivalNumber, { assetIdsToAdd: [], assetIdsToRemove: ids })
        invalidateAssetDetails(barcodes)
        invalidateArrivalLists()
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
  flushPendingRemovals: (arrivalNumber) => {
    const prefix = `${arrivalNumber}:`
    for (const [key, pending] of pendingRemovals) {
      if (!key.startsWith(prefix)) continue
      clearTimeout(pending.timer)
      void pending.commit()
    }
  },
}))
