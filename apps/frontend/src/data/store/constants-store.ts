import { create } from 'zustand'
import type { AssetType, CoreFunction, InvoiceType, ReferenceData, Role, Status, Warehouse } from 'shared-types'

interface ConstantsStore {
  coreFunctions: CoreFunction[]
  assetTypes: AssetType[]
  trackingStatuses: Status[]
  availabilityStatuses: Status[]
  technicalStatuses: Status[]
  roles: Role[]
  invoiceTypes: InvoiceType[]
  warehouses: Warehouse[]
  loading: boolean

  setConstants: (constants: ReferenceData) => void
  setLoading: (loading: boolean) => void

  clearConstants: () => void
}

export const useConstantsStore = create<ConstantsStore>((set) => ({
  coreFunctions: [],
  assetTypes: [],
  trackingStatuses: [],
  availabilityStatuses: [],
  technicalStatuses: [],
  roles: [],
  invoiceTypes: [],
  warehouses: [],
  loading: false,

  setConstants: (constants) => set({
    coreFunctions: constants.coreFunctions,
    assetTypes: constants.assetTypes,
    trackingStatuses: constants.trackingStatuses,
    availabilityStatuses: constants.availabilityStatuses,
    technicalStatuses: constants.technicalStatuses,
    roles: constants.roles,
    invoiceTypes: constants.invoiceTypes,
    warehouses: constants.warehouses,
  }),
  setLoading: (loading) => set({ loading }),
  clearConstants: () => set({
    coreFunctions: [],
    assetTypes: [],
    trackingStatuses: [],
    availabilityStatuses: [],
    technicalStatuses: [],
    roles: [],
    invoiceTypes: [],
    warehouses: [],
  })
}))