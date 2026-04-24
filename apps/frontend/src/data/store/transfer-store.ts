import { createTransfer, getTransferForUpdate, getTransfers as getTransfersApi, updateTransfer } from '@/data/api/transfer-api'
import { transferDetailKey } from '@/hooks/use-transfer-detail'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import type { ApiResponse, TransferSummary, Warehouse } from 'shared-types'
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
  submitCreateTransfer: (data: TransferForm) => Promise<ApiResponse<{ transferNumber: string }>>
  submitUpdateTransfer: (transferNumber: string, data: TransferForm) => Promise<ApiResponse<void>>
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
    const response = await createTransfer(data)
    set({ hasSearched: false })
    return response
  },
  submitUpdateTransfer: async (transferNumber, data) => {
    const response = await updateTransfer(transferNumber, data)
    if (response.success) mutate(transferDetailKey(transferNumber))
    return response
  },
  clearTransfers: () => set({ transfers: [] })
}))
