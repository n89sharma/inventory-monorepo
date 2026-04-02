import { getTransferDetail, getTransfers } from '@/data/api/transfer-api'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferDetail, TransferSummary, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface TransferStore {
  transfers: TransferSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  transferDetail: TransferDetail | null
  detailLoading: boolean
  detailError: string | null

  setTransfers: (t: TransferSummary[]) => void
  setFromDate: (d: SelectOption<Date>) => void
  setToDate: (d: SelectOption<Date>) => void
  setOrigin: (o: SelectOption<Warehouse>) => void
  setDestination: (d: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  setTransferDetail: (transferDetail: TransferDetail) => void
  getTransferDetails: (transferNumber: string) => Promise<void>
  getTransfers: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    origin: SelectOption<Warehouse>,
    destination: SelectOption<Warehouse>) => Promise<void>

  clearTransfers: () => void
}

export const useTransferStore = create<TransferStore>((set, get) => ({
  transfers: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  destination: ANY_OPTION,
  loading: false,
  hasSearched: false,
  transferDetail: null,
  detailLoading: false,
  detailError: null,

  setTransfers: (transfers) => set({ transfers }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setTransferDetail: (transferDetail) => set({ transferDetail }),
  getTransfers: async (fromDate, toDate, origin, destination) => {
    set({ hasSearched: true, transfers: await getTransfers(fromDate, toDate, origin, destination) })
  },
  getTransferDetails: async (transferNumber) => {
    if (get().transferDetail?.transfer_number === transferNumber) return
    set({ detailLoading: true, detailError: null })
    try {
      set({ transferDetail: await getTransferDetail(transferNumber) })
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load transfer' })
    } finally {
      set({ detailLoading: false })
    }
  },
  clearTransfers: () => set({ transfers: [] })
}))
