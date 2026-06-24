import type { AssetType, Brand, OrgSummary, User } from 'shared-types'
import {
  decodeIds,
  encodeIds,
  getSharedFilters,
  parseNonNegativeNumber,
  setSharedFilterParams,
  type SharedAssetFilters,
  type SharedAssetReferenceData,
} from '@/lib/asset-filter-params'

const PARAM_BRAND = 'brand'
const PARAM_TYPE = 'type'
const PARAM_HELD_BY = 'heldby'
const PARAM_HELD_FOR = 'heldfor'
const PARAM_HOLD_CUSTOMER = 'holdcustomer'
const PARAM_DAYS_HELD_MIN = 'heldmin'

export type SearchHeldFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
  heldBy: User | null
  heldFor: User | null
  holdCustomer: OrgSummary | null
  daysHeldMin: number | null
}

export type SearchHeldReferenceData = SharedAssetReferenceData & {
  brands: Brand[]
  assetTypes: AssetType[]
  users: User[]
  customers: OrgSummary[]
}

export function buildSearchHeldUrl(selection: {
  heldForId?: number
  holdCustomerId?: number
}): string {
  const params = new URLSearchParams()
  if (selection.heldForId !== undefined) params.set(PARAM_HELD_FOR, String(selection.heldForId))
  if (selection.holdCustomerId !== undefined) {
    params.set(PARAM_HOLD_CUSTOMER, String(selection.holdCustomerId))
  }
  return `/search/held?${params.toString()}`
}

export function filtersToParams(filters: SearchHeldFilters): URLSearchParams {
  const params = new URLSearchParams()
  setSharedFilterParams(params, filters)
  if (filters.brand) params.set(PARAM_BRAND, String(filters.brand.id))
  if (filters.assetTypes.length > 0) params.set(PARAM_TYPE, encodeIds(filters.assetTypes))
  if (filters.heldBy) params.set(PARAM_HELD_BY, String(filters.heldBy.id))
  if (filters.heldFor) params.set(PARAM_HELD_FOR, String(filters.heldFor.id))
  if (filters.holdCustomer) params.set(PARAM_HOLD_CUSTOMER, String(filters.holdCustomer.id))
  if (filters.daysHeldMin !== null) params.set(PARAM_DAYS_HELD_MIN, String(filters.daysHeldMin))
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchHeldReferenceData,
): SearchHeldFilters {
  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? (ref.brands.find((b) => b.id === Number.parseInt(brandId, 10)) ?? null)
    : null

  const heldById = params.get(PARAM_HELD_BY)
  const heldBy = heldById
    ? (ref.users.find((u) => u.id === Number.parseInt(heldById, 10)) ?? null)
    : null

  const heldForId = params.get(PARAM_HELD_FOR)
  const heldFor = heldForId
    ? (ref.users.find((u) => u.id === Number.parseInt(heldForId, 10)) ?? null)
    : null

  const holdCustomerId = params.get(PARAM_HOLD_CUSTOMER)
  const holdCustomer = holdCustomerId
    ? (ref.customers.find((c) => c.id === Number.parseInt(holdCustomerId, 10)) ?? null)
    : null

  return {
    ...getSharedFilters(params, ref),
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
    heldBy,
    heldFor,
    holdCustomer,
    daysHeldMin: parseNonNegativeNumber(params.get(PARAM_DAYS_HELD_MIN)),
  }
}
