import type { Transfer, Warehouse } from 'shared-types'
import { ANY_OPTION, UNSELECTED, type SelectOption } from 'shared-types'
import { create } from 'zustand'

interface TransferStore {
  transfers: Transfer[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean

  setTransfers: (t: Transfer[]) => void
  setFromDate: (d: SelectOption<Date>) => void
  setToDate: (d: SelectOption<Date>) => void
  setOrigin: (o: SelectOption<Warehouse>) => void
  setDestination: (d: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void

  clearTransfers: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  transfers: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  destination: ANY_OPTION,
  loading: false,
  hasSearched: false,

  setTransfers: (transfers) => set({ transfers }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),

  clearTransfers: () => set({ transfers: [] })
}))