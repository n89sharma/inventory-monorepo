import type { AssetType, Brand, OrgSummary, Status } from 'shared-types'
import {
  isAfter,
  isBefore,
  isValid,
  format,
  parseISO,
  startOfDay,
  subDays,
  subMonths,
} from 'date-fns'
import {
  decodeIds,
  encodeIds,
  getSharedFilters,
  setSharedFilterParams,
  type SharedAssetFilters,
  type SharedAssetReferenceData,
} from '@/lib/asset-filter-params'

const PARAM_BRAND = 'brand'
const PARAM_TYPE = 'type'
const PARAM_OTHER = 'other'
const PARAM_FROM = 'from'
const PARAM_TO = 'to'
const PARAM_CUSTOMER = 'customer'
const OTHER_ON = '1'

export const SOLD_STATUS = 'SOLD'
export const HARVESTED_STATUS = 'HARVESTED'
export const SCRAPPED_STATUS = 'SCRAPPED'

export const MAX_DEPARTED_MONTHS = 18
const DEFAULT_FROM_DAYS = 30
const URL_DATE_FORMAT = 'yyyy-MM-dd'

export function getDepartedFloor(): Date {
  return startOfDay(subMonths(new Date(), MAX_DEPARTED_MONTHS))
}

export function isValidSoldDateRange(from: Date, to: Date): boolean {
  return !isBefore(from, getDepartedFloor()) && !isAfter(from, to)
}

export type SearchSoldFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
  showOther: boolean
  fromDate: Date
  toDate: Date
  customer: OrgSummary | null
}

export type SearchSoldReferenceData = SharedAssetReferenceData & {
  brands: Brand[]
  assetTypes: AssetType[]
  customers: OrgSummary[]
}

export function resolveSoldStatuses(showOther: boolean, allStatuses: Status[]): Status[] {
  const wanted = new Set(
    showOther ? [HARVESTED_STATUS, SCRAPPED_STATUS] : [SOLD_STATUS],
  )
  return allStatuses.filter(s => wanted.has(s.status))
}

export function filtersToParams(filters: SearchSoldFilters): URLSearchParams {
  const params = new URLSearchParams()
  setSharedFilterParams(params, filters)
  if (filters.brand) params.set(PARAM_BRAND, String(filters.brand.id))
  if (filters.assetTypes.length > 0) params.set(PARAM_TYPE, encodeIds(filters.assetTypes))
  if (filters.showOther) params.set(PARAM_OTHER, OTHER_ON)
  params.set(PARAM_FROM, format(filters.fromDate, URL_DATE_FORMAT))
  params.set(PARAM_TO, format(filters.toDate, URL_DATE_FORMAT))
  if (filters.customer) params.set(PARAM_CUSTOMER, String(filters.customer.id))
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchSoldReferenceData,
): SearchSoldFilters {
  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? ref.brands.find(b => b.id === Number.parseInt(brandId, 10)) ?? null
    : null

  const fromRaw = params.get(PARAM_FROM)
  const parsedFrom = fromRaw ? parseISO(fromRaw) : null
  const fromDate = parsedFrom && isValid(parsedFrom)
    ? parsedFrom
    : startOfDay(subDays(new Date(), DEFAULT_FROM_DAYS))

  const toRaw = params.get(PARAM_TO)
  const parsedTo = toRaw ? parseISO(toRaw) : null
  const toDate = parsedTo && isValid(parsedTo) ? parsedTo : new Date()

  const customerId = params.get(PARAM_CUSTOMER)
  const customer = customerId
    ? ref.customers.find(c => c.id === Number.parseInt(customerId, 10)) ?? null
    : null

  return {
    ...getSharedFilters(params, ref),
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
    showOther: params.get(PARAM_OTHER) === OTHER_ON,
    fromDate,
    toDate,
    customer,
  }
}
