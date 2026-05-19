import { createDeparture, getDepartureDetail, patchDepartureAssets, updateDepartureMetadata as updateDepartureMetadataApi } from '@/data/api/departure-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { departureDetailKey } from '@/hooks/use-departure-detail'
import { invalidateDepartureLists } from '@/hooks/use-departures-list'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { DepartureForm, DepartureMetadataForm } from '@/ui-types/departure-form-types'
import type { AssetSummary, DepartureDetail, Warehouse } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(departureNumber: string, assetId: number): string {
  return `${departureNumber}:${assetId}`
}

interface DepartureStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setOrigin: (warehouse: SelectOption<Warehouse>) => void
  setHasSearched: (hasSearched: boolean) => void
  submitCreateDeparture: (data: DepartureForm) => Promise<{ departureNumber: string }>
  getAssets: (departureNumber: string) => Promise<AssetSummary[]>
  addAssets: (departureNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  addAssetToDeparture: (departureNumber: string, asset: AssetSummary) => Promise<void>
  addAssetsToDeparture: (departureNumber: string, assets: AssetSummary[]) => Promise<void>
  updateDepartureMetadata: (departureNumber: string, metadata: DepartureMetadataForm) => Promise<void>
  removeAssetFromDeparture: (departureNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromDeparture: (departureNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (departureNumber: string) => void
}

export const useDepartureStore = create<DepartureStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  submitCreateDeparture: async (data) => {
    const result = await createDeparture(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    invalidateDepartureLists()
    return result
  },
  getAssets: async (departureNumber) => {
    return (await getDepartureDetail(departureNumber)).assets
  },
  addAssets: async (departureNumber, assets) => {
    const existing = (await getDepartureDetail(departureNumber)).assets
    const existingIds = new Set(existing.map(a => a.id))
    const newOnly = assets.filter(a => !existingIds.has(a.id))
    const added = newOnly.length
    const skipped = assets.length - added
    if (added > 0) {
      await patchDepartureAssets(departureNumber, { assetIdsToAdd: newOnly.map(a => a.id), assetIdsToRemove: [] })
      mutate(departureDetailKey(departureNumber))
      invalidateAssetDetails(newOnly.map(a => a.barcode))
      invalidateDepartureLists()
    }
    return { added, skipped }
  },
  addAssetToDeparture: async (departureNumber, asset) => {
    const cacheKey = departureDetailKey(departureNumber)
    mutate<DepartureDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, asset] } : current,
      { revalidate: false }
    )
    try {
      await patchDepartureAssets(departureNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
      invalidateAssetDetails([asset.barcode])
      invalidateDepartureLists()
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
  },
  updateDepartureMetadata: async (departureNumber, metadata) => {
    await updateDepartureMetadataApi(departureNumber, metadata)
    mutate(departureDetailKey(departureNumber))
    invalidateDepartureLists()
  },
  addAssetsToDeparture: async (departureNumber, assets) => {
    if (assets.length === 0) return
    const cacheKey = departureDetailKey(departureNumber)
    const ids = assets.map(a => a.id)
    const barcodes = assets.map(a => a.barcode)
    mutate<DepartureDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, ...assets] } : current,
      { revalidate: false }
    )
    try {
      await patchDepartureAssets(departureNumber, { assetIdsToAdd: ids, assetIdsToRemove: [] })
      invalidateAssetDetails(barcodes)
      invalidateDepartureLists()
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
  },
  removeAssetFromDeparture: (departureNumber, asset) => {
    const key = pendingKey(departureNumber, asset.id)
    const cacheKey = departureDetailKey(departureNumber)

    mutate<DepartureDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => a.id !== asset.id) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchDepartureAssets(departureNumber, { assetIdsToAdd: [], assetIdsToRemove: [asset.id] })
        invalidateAssetDetails([asset.barcode])
        invalidateDepartureLists()
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
  bulkRemoveAssetsFromDeparture: (departureNumber, assets) => {
    if (assets.length === 0) return
    const ids = assets.map(a => a.id)
    const idSet = new Set(ids)
    const barcodes = assets.map(a => a.barcode)
    const key = `${departureNumber}:bulk:${Date.now()}`
    const cacheKey = departureDetailKey(departureNumber)

    mutate<DepartureDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => !idSet.has(a.id)) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchDepartureAssets(departureNumber, { assetIdsToAdd: [], assetIdsToRemove: ids })
        invalidateAssetDetails(barcodes)
        invalidateDepartureLists()
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
  flushPendingRemovals: (departureNumber) => {
    const prefix = `${departureNumber}:`
    for (const [key, pending] of pendingRemovals) {
      if (!key.startsWith(prefix)) continue
      clearTimeout(pending.timer)
      void pending.commit()
    }
  },
}))
