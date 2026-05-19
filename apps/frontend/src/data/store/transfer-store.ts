import { createTransfer, getTransferDetail, patchTransferAssets, updateTransferMetadata as updateTransferMetadataApi } from '@/data/api/transfer-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { transferDetailKey } from '@/hooks/use-transfer-detail'
import { invalidateTransferLists } from '@/hooks/use-transfers-list'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferForm, TransferMetadataForm } from '@/ui-types/transfer-form-types'
import type { AssetSummary, TransferDetail, Warehouse } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(transferNumber: string, assetId: number): string {
  return `${transferNumber}:${assetId}`
}

interface TransferStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  hasSearched: boolean

  setFromDate: (d: SelectOption<Date>) => void
  setToDate: (d: SelectOption<Date>) => void
  setOrigin: (o: SelectOption<Warehouse>) => void
  setDestination: (d: SelectOption<Warehouse>) => void
  setHasSearched: (hasSearched: boolean) => void
  submitCreateTransfer: (data: TransferForm) => Promise<{ transferNumber: string }>
  getAssets: (transferNumber: string) => Promise<AssetSummary[]>
  addAssets: (transferNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  addAssetToTransfer: (transferNumber: string, asset: AssetSummary) => Promise<void>
  addAssetsToTransfer: (transferNumber: string, assets: AssetSummary[]) => Promise<void>
  updateTransferMetadata: (transferNumber: string, metadata: TransferMetadataForm) => Promise<void>
  removeAssetFromTransfer: (transferNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromTransfer: (transferNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (transferNumber: string) => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  submitCreateTransfer: async (data) => {
    const result = await createTransfer(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    invalidateTransferLists()
    return result
  },
  getAssets: async (transferNumber) => {
    return (await getTransferDetail(transferNumber)).assets
  },
  addAssets: async (transferNumber, assets) => {
    const existing = (await getTransferDetail(transferNumber)).assets
    const existingIds = new Set(existing.map(a => a.id))
    const newOnly = assets.filter(a => !existingIds.has(a.id))
    const added = newOnly.length
    const skipped = assets.length - added
    if (added > 0) {
      await patchTransferAssets(transferNumber, { assetIdsToAdd: newOnly.map(a => a.id), assetIdsToRemove: [] })
      mutate(transferDetailKey(transferNumber))
      invalidateAssetDetails(newOnly.map(a => a.barcode))
      invalidateTransferLists()
    }
    return { added, skipped }
  },
  updateTransferMetadata: async (transferNumber, metadata) => {
    await updateTransferMetadataApi(transferNumber, metadata)
    mutate(transferDetailKey(transferNumber))
    invalidateTransferLists()
  },
  addAssetToTransfer: async (transferNumber, asset) => {
    const cacheKey = transferDetailKey(transferNumber)
    mutate<TransferDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, asset] } : current,
      { revalidate: false }
    )
    try {
      await patchTransferAssets(transferNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
      invalidateAssetDetails([asset.barcode])
      invalidateTransferLists()
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
  },
  addAssetsToTransfer: async (transferNumber, assets) => {
    if (assets.length === 0) return
    const cacheKey = transferDetailKey(transferNumber)
    const ids = assets.map(a => a.id)
    const barcodes = assets.map(a => a.barcode)
    mutate<TransferDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, ...assets] } : current,
      { revalidate: false }
    )
    try {
      await patchTransferAssets(transferNumber, { assetIdsToAdd: ids, assetIdsToRemove: [] })
      invalidateAssetDetails(barcodes)
      invalidateTransferLists()
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
  },
  removeAssetFromTransfer: (transferNumber, asset) => {
    const key = pendingKey(transferNumber, asset.id)
    const cacheKey = transferDetailKey(transferNumber)

    mutate<TransferDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => a.id !== asset.id) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchTransferAssets(transferNumber, { assetIdsToAdd: [], assetIdsToRemove: [asset.id] })
        invalidateAssetDetails([asset.barcode])
        invalidateTransferLists()
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
  bulkRemoveAssetsFromTransfer: (transferNumber, assets) => {
    if (assets.length === 0) return
    const ids = assets.map(a => a.id)
    const idSet = new Set(ids)
    const barcodes = assets.map(a => a.barcode)
    const key = `${transferNumber}:bulk:${Date.now()}`
    const cacheKey = transferDetailKey(transferNumber)

    mutate<TransferDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => !idSet.has(a.id)) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchTransferAssets(transferNumber, { assetIdsToAdd: [], assetIdsToRemove: ids })
        invalidateAssetDetails(barcodes)
        invalidateTransferLists()
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
  flushPendingRemovals: (transferNumber) => {
    const prefix = `${transferNumber}:`
    for (const [key, pending] of pendingRemovals) {
      if (!key.startsWith(prefix)) continue
      clearTimeout(pending.timer)
      void pending.commit()
    }
  },
}))
