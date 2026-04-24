import {
  createTransfer,
  getTransferDetail,
  getTransferForUpdate,
  getTransfers as getTransfersApi,
  updateTransfer
} from '@/data/api/transfer-api'
import { produce } from 'immer'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import type { ApiResponse, TransferDetail, TransferSummary, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface TransferStore {
  transfers: TransferSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  hasSearched: boolean
  detailLoading: boolean
  detailError: string | null
  transferFormData: TransferForm | null
  transferDetailCache: Record<string, TransferDetail>

  setFromDate: (d: SelectOption<Date>) => void
  setToDate: (d: SelectOption<Date>) => void
  setOrigin: (o: SelectOption<Warehouse>) => void
  setDestination: (d: SelectOption<Warehouse>) => void
  getTransfers: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    origin: SelectOption<Warehouse>,
    destination: SelectOption<Warehouse>) => Promise<void>
  getTransferDetails: (transferNumber: string) => Promise<void>
  getTransferForUpdate: (transferNumber: string) => Promise<void>
  submitCreateTransfer: (data: TransferForm) => Promise<ApiResponse<{ transferNumber: string }>>
  submitUpdateTransfer: (transferNumber: string, data: TransferForm) => Promise<ApiResponse<void>>
  clearTransfers: () => void
}

export const useTransferStore = create<TransferStore>((set, get) => ({
  transfers: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,
  detailLoading: false,
  detailError: null,
  transferFormData: null,
  transferDetailCache: {},

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
  getTransferDetails: async (transferNumber) => {
    if (get().transferDetailCache[transferNumber]) return
    set({ detailLoading: true, detailError: null })
    try {
      const detail = await getTransferDetail(transferNumber)
      set(produce(draft => { draft.transferDetailCache[transferNumber] = detail }))
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load transfer' })
    } finally {
      set({ detailLoading: false })
    }
  },
  submitCreateTransfer: async (data) => {
    const response = await createTransfer(data)
    set({ hasSearched: false })
    return response
  },
  submitUpdateTransfer: (transferNumber, data) => {
    set(produce(draft => { delete draft.transferDetailCache[transferNumber] }))
    return updateTransfer(transferNumber, data)
  },

  clearTransfers: () => set({ transfers: [] })
}))
