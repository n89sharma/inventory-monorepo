import { createInvoice, getInvoiceForUpdate, getInvoices, patchInvoiceAssets, updateInvoice } from '@/data/api/invoice-api'
import { invalidateAssetDetails } from '@/data/cache/asset-cache'
import { invoiceDetailKey } from '@/hooks/use-invoice-detail'
import { mergeAssets } from '@/lib/collection-utils'
import type { InvoiceEditForm, InvoiceForm } from '@/ui-types/invoice-form-types'
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
  invoiceEditFormData: InvoiceEditForm | null

  setInvoices: (invoices: InvoiceSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void
  getInvoices: (fromDate: SelectOption<Date>, toDate: SelectOption<Date>) => Promise<void>
  submitCreateInvoice: (data: InvoiceForm) => Promise<{ invoiceNumber: string }>
  getInvoiceForUpdate: (invoiceNumber: string) => Promise<void>
  submitUpdateInvoice: (invoiceNumber: string, data: InvoiceEditForm) => Promise<{ invoiceNumber: string }>
  addAssets: (invoiceNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  getAssets: (invoiceNumber: string) => Promise<AssetSummary[]>
  addAssetToInvoice: (invoiceNumber: string, asset: AssetSummary) => Promise<void>
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
  invoiceEditFormData: null,

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
  getInvoiceForUpdate: async (invoiceNumber) => {
    set({ invoiceEditFormData: null })
    set({ invoiceEditFormData: await getInvoiceForUpdate(invoiceNumber) })
  },
  submitUpdateInvoice: async (invoiceNumber, data) => {
    const previousAssets = useInvoiceStore.getState().invoiceEditFormData?.assets ?? []
    const affected = new Set<string>()
    for (const a of previousAssets) affected.add(a.barcode)
    for (const a of data.assets) affected.add(a.barcode)
    const result = await updateInvoice(invoiceNumber, data)
    mutate(invoiceDetailKey(invoiceNumber))
    invalidateAssetDetails([...affected])
    return result
  },
  addAssets: async (invoiceNumber, assets) => {
    const form = await getInvoiceForUpdate(invoiceNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateInvoice(invoiceNumber, { ...form, assets: merged })
    mutate(invoiceDetailKey(invoiceNumber))
    invalidateAssetDetails(assets.map(a => a.barcode))
    return { added, skipped }
  },
  getAssets: async (invoiceNumber) => {
    const form = await getInvoiceForUpdate(invoiceNumber)
    return form?.assets ?? []
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
