import { createInvoice, getInvoiceDetail, getInvoices, patchInvoiceAssets, updateInvoiceMetadata as updateInvoiceMetadataApi } from '@/data/api/invoice-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { invoiceDetailKey } from '@/hooks/use-invoice-detail'
import type { InvoiceForm, InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { AssetSummary, InvoiceDetail, InvoiceSummary } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { create } from 'zustand'

const UNDO_WINDOW_MS = 5000
const pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>()

function pendingKey(invoiceNumber: string, assetId: number): string {
  return `${invoiceNumber}:${assetId}`
}

interface InvoiceStore {
  invoices: InvoiceSummary[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  hasSearched: boolean

  setInvoices: (invoices: InvoiceSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void
  getInvoices: (fromDate: SelectOption<Date>, toDate: SelectOption<Date>) => Promise<void>
  submitCreateInvoice: (data: InvoiceForm) => Promise<{ invoiceNumber: string }>
  getAssets: (invoiceNumber: string) => Promise<AssetSummary[]>
  addAssets: (invoiceNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  addAssetToInvoice: (invoiceNumber: string, asset: AssetSummary) => Promise<void>
  updateInvoiceMetadata: (invoiceNumber: string, metadata: InvoiceMetadataForm) => Promise<void>
  removeAssetFromInvoice: (invoiceNumber: string, asset: AssetSummary) => void
  bulkRemoveAssetsFromInvoice: (invoiceNumber: string, assets: AssetSummary[]) => void
  flushPendingRemovals: (invoiceNumber: string) => void
  clearInvoices: () => void
}

export const useInvoiceStore = create<InvoiceStore>((set) => ({
  invoices: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  hasSearched: false,

  setInvoices: (invoices) => set({ invoices }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  getInvoices: async (fromDate, toDate) => {
    set({ hasSearched: true, invoices: await getInvoices(fromDate, toDate) })
  },
  submitCreateInvoice: async (data) => {
    const result = await createInvoice(data)
    invalidateAssetDetails(data.assets.map(a => a.barcode))
    set({ hasSearched: false })
    return result
  },
  getAssets: async (invoiceNumber) => {
    return (await getInvoiceDetail(invoiceNumber)).assets
  },
  addAssets: async (invoiceNumber, assets) => {
    const existing = (await getInvoiceDetail(invoiceNumber)).assets
    const existingIds = new Set(existing.map(a => a.id))
    const newOnly = assets.filter(a => !existingIds.has(a.id))
    const added = newOnly.length
    const skipped = assets.length - added
    if (added > 0) {
      await patchInvoiceAssets(invoiceNumber, { assetIdsToAdd: newOnly.map(a => a.id), assetIdsToRemove: [] })
      mutate(invoiceDetailKey(invoiceNumber))
      invalidateAssetDetails(newOnly.map(a => a.barcode))
    }
    return { added, skipped }
  },
  updateInvoiceMetadata: async (invoiceNumber, metadata) => {
    await updateInvoiceMetadataApi(invoiceNumber, metadata)
    mutate(invoiceDetailKey(invoiceNumber))
  },
  addAssetToInvoice: async (invoiceNumber, asset) => {
    const cacheKey = invoiceDetailKey(invoiceNumber)
    mutate<InvoiceDetail>(
      cacheKey,
      current => current ? { ...current, assets: [...current.assets, asset] } : current,
      { revalidate: false }
    )
    try {
      await patchInvoiceAssets(invoiceNumber, { assetIdsToAdd: [asset.id], assetIdsToRemove: [] })
      invalidateAssetDetails([asset.barcode])
    } catch (err) {
      mutate(cacheKey)
      throw err
    } finally {
      mutate(cacheKey)
    }
  },
  removeAssetFromInvoice: (invoiceNumber, asset) => {
    const key = pendingKey(invoiceNumber, asset.id)
    const cacheKey = invoiceDetailKey(invoiceNumber)

    mutate<InvoiceDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => a.id !== asset.id) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchInvoiceAssets(invoiceNumber, { assetIdsToAdd: [], assetIdsToRemove: [asset.id] })
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
  bulkRemoveAssetsFromInvoice: (invoiceNumber, assets) => {
    if (assets.length === 0) return
    const ids = assets.map(a => a.id)
    const idSet = new Set(ids)
    const barcodes = assets.map(a => a.barcode)
    const key = `${invoiceNumber}:bulk:${Date.now()}`
    const cacheKey = invoiceDetailKey(invoiceNumber)

    mutate<InvoiceDetail>(
      cacheKey,
      current => current ? { ...current, assets: current.assets.filter(a => !idSet.has(a.id)) } : current,
      { revalidate: false }
    )

    const commit = async () => {
      pendingRemovals.delete(key)
      try {
        await patchInvoiceAssets(invoiceNumber, { assetIdsToAdd: [], assetIdsToRemove: ids })
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
  flushPendingRemovals: (invoiceNumber) => {
    const prefix = `${invoiceNumber}:`
    for (const [key, pending] of pendingRemovals) {
      if (!key.startsWith(prefix)) continue
      clearTimeout(pending.timer)
      void pending.commit()
    }
  },
  clearInvoices: () => set({ invoices: [] })
}))
