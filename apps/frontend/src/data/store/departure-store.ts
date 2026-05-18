import { createDeparture, getDepartureForUpdate, getDepartures, patchDepartureAssets, updateDeparture } from '@/data/api/departure-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { departureDetailKey } from '@/hooks/use-departure-detail'
import { mergeAssets } from '@/lib/collection-utils'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import type { AssetSummary, DepartureDetail, DepartureSummary, Warehouse } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(departureNumber: string, assetId: number): string {
  return `${departureNumber}:${assetId}`
}

interface DepartureStore {
  departures: DepartureSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  departureFormData: DepartureForm | null

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setOrigin: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  getDepartures: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    origin: SelectOption<Warehouse>) => Promise<void>
  getDepartureForUpdate: (departureNumber: string) => Promise<void>
  submitCreateDeparture: (data: DepartureForm) => Promise<{ departureNumber: string }>
  submitUpdateDeparture: (departureNumber: string, data: DepartureForm) => Promise<void>
  addAssets: (departureNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  addAssetToDeparture: (departureNumber: string, asset: AssetSummary) => Promise<void>
  addAssetsToDeparture: (departureNumber: string, assets: AssetSummary[]) => Promise<void>
  getAssets: (departureNumber: string) => Promise<AssetSummary[]>
  removeAssetFromDeparture: (departureNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromDeparture: (departureNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (departureNumber: string) => void
  clearDepartures: () => void
}

export const useDepartureStore = create<DepartureStore>((set) => ({
  departures: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  loading: false,
  hasSearched: false,
  departureFormData: null,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  getDepartures: async (fromDate, toDate, origin) => {
    set({ hasSearched: true, departures: await getDepartures(fromDate, toDate, origin) })
  },
  getDepartureForUpdate: async (departureNumber) => {
    set({ departureFormData: null })
    set({ departureFormData: await getDepartureForUpdate(departureNumber) })
  },
  submitCreateDeparture: async (data) => {
    const result = await createDeparture(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    set({ hasSearched: false })
    return result
  },
  submitUpdateDeparture: async (departureNumber, data) => {
    const previousAssets = useDepartureStore.getState().departureFormData?.assets ?? []
    const affected = new Set<string>()
    for (const a of previousAssets) affected.add(a.barcode)
    for (const a of data.assets) affected.add(a.barcode)
    await updateDeparture(departureNumber, data)
    mutate(departureDetailKey(departureNumber))
    invalidateAssetDetails([...affected])
  },
  addAssets: async (departureNumber, assets) => {
    const form = await getDepartureForUpdate(departureNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateDeparture(departureNumber, { ...form, assets: merged })
    mutate(departureDetailKey(departureNumber))
    invalidateAssetDetails(assets.map(a => a.barcode))
    return { added, skipped }
  },
  getAssets: async (departureNumber) => {
    const form = await getDepartureForUpdate(departureNumber)
    return form?.assets ?? []
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
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
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
  clearDepartures: () => set({ departures: [] })
}))
