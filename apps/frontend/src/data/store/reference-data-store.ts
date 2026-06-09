import { createBrand as createBrandApi, getBrands as getBrandsApi } from '@/data/api/brand-api'
import type { BrandForm } from '@/ui-types/brand-form-types'
import type { AssetType, Brand, Component, CoreFunction, Country, Error, InvoiceType, ReferenceData, Status, Warehouse, Zone } from 'shared-types'
import { create } from 'zustand'

interface ReferenceDataStore {
  coreFunctions: CoreFunction[]
  assetTypes: AssetType[]
  brands: Brand[]
  statuses: Status[]
  readinesses: Status[]
  invoiceTypes: InvoiceType[]
  warehouses: Warehouse[]
  zones: Zone[]
  errors: Error[]
  components: Component[]
  countries: Country[]
  loading: boolean

  setReferenceData: (refData: ReferenceData) => void
  setBrands: (brands: Brand[]) => void
  setLoading: (loading: boolean) => void
  createBrand: (data: BrandForm) => Promise<{ id: number }>

  clearReferenceData: () => void
}

export const useReferenceDataStore = create<ReferenceDataStore>((set) => ({
  coreFunctions: [],
  assetTypes: [],
  brands: [],
  statuses: [],
  readinesses: [],
  invoiceTypes: [],
  warehouses: [],
  zones: [],
  errors: [],
  components: [],
  countries: [],
  loading: false,

  setReferenceData: (referenceData) => set({
    coreFunctions: referenceData.coreFunctions,
    assetTypes: referenceData.assetTypes,
    brands: referenceData.brands,
    statuses: referenceData.statuses,
    readinesses: referenceData.readinesses,
    invoiceTypes: referenceData.invoiceTypes,
    warehouses: referenceData.warehouses,
    zones: referenceData.zones,
    errors: referenceData.errors,
    components: referenceData.components,
    countries: referenceData.countries
  }),
  setBrands: (brands) => set({ brands }),
  setLoading: (loading) => set({ loading }),
  createBrand: async (data) => {
    const result = await createBrandApi(data)
    set({ brands: await getBrandsApi() })
    return result
  },

  clearReferenceData: () => set({
    coreFunctions: [],
    assetTypes: [],
    brands: [],
    statuses: [],
    readinesses: [],
    invoiceTypes: [],
    warehouses: [],
    zones: [],
    errors: [],
    components: [],
    countries: []
  })
}))
