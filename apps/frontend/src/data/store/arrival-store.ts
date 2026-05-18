import { createArrival, createSingleArrivalAsset, getArrivalAssetForUpdate, getArrivalForUpdate, getArrivals, patchArrivalAssets, updateArrival, updateArrivalAsset as updateArrivalAssetApi } from '@/data/api/arrival-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import type { ArrivalForm, AssetForm } from '@/ui-types/arrival-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ArrivalDetail, ArrivalSummary, AssetSummary, Warehouse } from 'shared-types'
import { arrivalDetailKey } from '@/hooks/use-arrival-detail'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(arrivalNumber: string, assetId: number): string {
  return `${arrivalNumber}:${assetId}`
}

interface ArrivalStore {
  arrivals: ArrivalSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  destination: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  arrivalFormData: ArrivalForm | null

  setArrivals: (arrivals: ArrivalSummary[]) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  getArrivals: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    destination: SelectOption<Warehouse>) => Promise<void>
  getArrivalForUpdate: (arrivalNumber: string) => Promise<void>
  submitCreateArrival: (data: ArrivalForm) => Promise<{ arrivalNumber: string }>
  submitUpdateArrival: (arrivalNumber: string, data: ArrivalForm) => Promise<void>
  createArrivalAsset: (arrivalNumber: string, asset: AssetForm) => Promise<void>
  getArrivalAssetForEdit: (arrivalNumber: string, assetId: number) => Promise<AssetForm>
  updateArrivalAsset: (arrivalNumber: string, assetId: number, asset: AssetForm) => Promise<void>
  removeAssetFromArrival: (arrivalNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromArrival: (arrivalNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (arrivalNumber: string) => void
  clearArrivals: () => void
}

export const useArrivalStore = create<ArrivalStore>((set) => ({
  arrivals: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,
  arrivalFormData: null,

  setArrivals: (arrivals) => set({ arrivals }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),

  getArrivals: async (fromDate, toDate, destination) => {
    set({ hasSearched: true, arrivals: await getArrivals(fromDate, toDate, destination) })
  },
  getArrivalForUpdate: async (arrivalNumber) => {
    set({ arrivalFormData: null })
    set({ arrivalFormData: await getArrivalForUpdate(arrivalNumber) })
  },
  submitCreateArrival: async (data: ArrivalForm) => {
    const result = await createArrival(data)
    set({ hasSearched: false })
    return result
  },
  submitUpdateArrival: async (arrivalNumber, data) => {
    await updateArrival(arrivalNumber, data)
    mutate(arrivalDetailKey(arrivalNumber))
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

  clearArrivals: () => set({ arrivals: [] })
}))
