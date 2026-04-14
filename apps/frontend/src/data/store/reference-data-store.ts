import type { AssetType, Brand, CoreFunction, Error, InvoiceType, ReferenceData, Role, Status, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface ReferenceDataStore {
  coreFunctions: CoreFunction[]
  assetTypes: AssetType[]
  brands: Brand[]
  trackingStatuses: Status[]
  availabilityStatuses: Status[]
  technicalStatuses: Status[]
  roles: Role[]
  invoiceTypes: InvoiceType[]
  warehouses: Warehouse[]
  errors: Error[]
  loading: boolean

  setReferenceData: (refData: ReferenceData) => void
  setBrands: (brands: Brand[]) => void
  setLoading: (loading: boolean) => void

  clearReferenceData: () => void
}

export const useReferenceDataStore = create<ReferenceDataStore>((set) => ({
  coreFunctions: [],
  assetTypes: [],
  brands: [],
  trackingStatuses: [],
  availabilityStatuses: [],
  technicalStatuses: [],
  roles: [],
  invoiceTypes: [],
  warehouses: [],
  errors: [],
  loading: false,

  setReferenceData: (referenceData) => set({
    coreFunctions: referenceData.coreFunctions,
    assetTypes: referenceData.assetTypes,
    brands: referenceData.brands,
    trackingStatuses: referenceData.trackingStatuses,
    availabilityStatuses: referenceData.availabilityStatuses,
    technicalStatuses: referenceData.technicalStatuses,
    roles: referenceData.roles,
    invoiceTypes: referenceData.invoiceTypes,
    warehouses: referenceData.warehouses,
    errors: referenceData.errors
  }),
  setBrands: (brands) => set({ brands }),
  setLoading: (loading) => set({ loading }),
  clearReferenceData: () => set({
    coreFunctions: [],
    assetTypes: [],
    brands: [],
    trackingStatuses: [],
    availabilityStatuses: [],
    technicalStatuses: [],
    roles: [],
    invoiceTypes: [],
    warehouses: [],
    errors: []
  })
}))