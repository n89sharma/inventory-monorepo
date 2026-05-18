import { createTransfer, getTransferForUpdate, getTransfers as getTransfersApi, patchTransferAssets, updateTransfer } from '@/data/api/transfer-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { transferDetailKey } from '@/hooks/use-transfer-detail'
import { mergeAssets } from '@/lib/collection-utils'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import type { AssetSummary, TransferDetail, TransferSummary, Warehouse } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(transferNumber: string, assetId: number): string {
  return `${transferNumber}:${assetId}`
}

interface TransferStore {
  transfers: TransferSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  hasSearched: boolean
  transferFormData: TransferForm | null

  setFromDate: (d: SelectOption<Date>) => void
  setToDate: (d: SelectOption<Date>) => void
  setOrigin: (o: SelectOption<Warehouse>) => void
  setDestination: (d: SelectOption<Warehouse>) => void
  getTransfers: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    origin: SelectOption<Warehouse>,
    destination: SelectOption<Warehouse>) => Promise<void>
  getTransferForUpdate: (transferNumber: string) => Promise<void>
  submitCreateTransfer: (data: TransferForm) => Promise<{ transferNumber: string }>
  submitUpdateTransfer: (transferNumber: string, data: TransferForm) => Promise<void>
  addAssets: (transferNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  getAssets: (transferNumber: string) => Promise<AssetSummary[]>
  removeAssetFromTransfer: (transferNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromTransfer: (transferNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (transferNumber: string) => void
  clearTransfers: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  transfers: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,
  transferFormData: null,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  getTransfers: async (fromDate, toDate, origin, destination) => {
    set({ hasSearched: true, transfers: await getTransfersApi(fromDate, toDate, origin, destination) })
  },
  getTransferForUpdate: async (transferNumber) => {
    set({ transferFormData: null })
    set({ transferFormData: await getTransferForUpdate(transferNumber) })
  },
  submitCreateTransfer: async (data) => {
    const result = await createTransfer(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    set({ hasSearched: false })
    return result
  },
  submitUpdateTransfer: async (transferNumber, data) => {
    const previousAssets = useTransferStore.getState().transferFormData?.assets ?? []
    const affected = new Set<string>()
    for (const a of previousAssets) affected.add(a.barcode)
    for (const a of data.assets) affected.add(a.barcode)
    await updateTransfer(transferNumber, data)
    mutate(transferDetailKey(transferNumber))
    invalidateAssetDetails([...affected])
  },
  addAssets: async (transferNumber, assets) => {
    const form = await getTransferForUpdate(transferNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateTransfer(transferNumber, { ...form, assets: merged })
    mutate(transferDetailKey(transferNumber))
    invalidateAssetDetails(assets.map(a => a.barcode))
    return { added, skipped }
  },
  getAssets: async (transferNumber) => {
    const form = await getTransferForUpdate(transferNumber)
    return form?.assets ?? []
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
  clearTransfers: () => set({ transfers: [] })
}))
