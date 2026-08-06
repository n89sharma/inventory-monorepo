import { getReferenceData } from '@/data/api/reference-data-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type {
  AssetType,
  Brand,
  Component,
  CoreFunction,
  Country,
  Error as ErrorCode,
  InvoiceType,
  Status,
  Warehouse,
  Zone,
} from 'shared-types'
import useSWR, { mutate } from 'swr'

const REFERENCE_DATA_KEY = 'reference-data'

const EMPTY_CORE_FUNCTIONS: CoreFunction[] = []
const EMPTY_ASSET_TYPES: AssetType[] = []
const EMPTY_BRANDS: Brand[] = []
const EMPTY_STATUSES: Status[] = []
const EMPTY_READINESSES: Status[] = []
const EMPTY_INVOICE_TYPES: InvoiceType[] = []
const EMPTY_WAREHOUSES: Warehouse[] = []
const EMPTY_ZONES: Zone[] = []
const EMPTY_ERROR_CODES: ErrorCode[] = []
const EMPTY_ASSET_COMPONENTS: Component[] = []
const EMPTY_COUNTRIES: Country[] = []

function useReferenceData() {
  return useSWR(REFERENCE_DATA_KEY, getReferenceData, CATALOG_DATA_OPTIONS)
}

export function useReferenceDataLoaded(): boolean {
  return useReferenceData().data !== undefined
}

export function useCoreFunctions(): CoreFunction[] {
  return useReferenceData().data?.coreFunctions ?? EMPTY_CORE_FUNCTIONS
}

export function useAssetTypes(): AssetType[] {
  return useReferenceData().data?.assetTypes ?? EMPTY_ASSET_TYPES
}

export function useBrands(): Brand[] {
  return useReferenceData().data?.brands ?? EMPTY_BRANDS
}

export function useStatuses(): Status[] {
  return useReferenceData().data?.statuses ?? EMPTY_STATUSES
}

export function useReadinesses(): Status[] {
  return useReferenceData().data?.readinesses ?? EMPTY_READINESSES
}

export function useInvoiceTypes(): InvoiceType[] {
  return useReferenceData().data?.invoiceTypes ?? EMPTY_INVOICE_TYPES
}

export function useWarehouses(): Warehouse[] {
  return useReferenceData().data?.warehouses ?? EMPTY_WAREHOUSES
}

export function useZones(): Zone[] {
  return useReferenceData().data?.zones ?? EMPTY_ZONES
}

export function useErrorCodes(): ErrorCode[] {
  return useReferenceData().data?.errors ?? EMPTY_ERROR_CODES
}

export function useAssetComponents(): Component[] {
  return useReferenceData().data?.components ?? EMPTY_ASSET_COMPONENTS
}

export function useCountries(): Country[] {
  return useReferenceData().data?.countries ?? EMPTY_COUNTRIES
}

export function invalidateReferenceData() {
  return mutate(REFERENCE_DATA_KEY)
}
