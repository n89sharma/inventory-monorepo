import { createTransfer, getTransferForUpdate, getTransfers as getTransfersApi, updateTransfer } from '@/data/api/transfer-api'
import { transferDetailKey } from '@/hooks/use-transfer-detail'
import { mergeAssets } from '@/lib/collection-utils'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import type { AssetSummary, TransferSummary, Warehouse } from 'shared-types'
import { mutate } from 'swr'
import { create } from 'zustand'

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
    set({ hasSearched: false })
    return result
  },
  submitUpdateTransfer: async (transferNumber, data) => {
    await updateTransfer(transferNumber, data)
    mutate(transferDetailKey(transferNumber))
  },
  addAssets: async (transferNumber, assets) => {
    const form = await getTransferForUpdate(transferNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateTransfer(transferNumber, { ...form, assets: merged })
    mutate(transferDetailKey(transferNumber))
    return { added, skipped }
  },
  getAssets: async (transferNumber) => {
    const form = await getTransferForUpdate(transferNumber)
    return form?.assets ?? []
  },
  clearTransfers: () => set({ transfers: [] })
}))
