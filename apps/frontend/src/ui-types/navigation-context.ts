export type NavigationSection =
  | 'arrivals'
  | 'departures'
  | 'transfers'
  | 'invoices'
  | 'holds'
  | 'search'
  | 'home'
  | 'assets'

const COLLECTION_SECTIONS = new Set<NavigationSection>([
  'arrivals',
  'departures',
  'transfers',
  'invoices',
  'holds',
])

export function isCollection(navigationSection: NavigationSection) {
  return COLLECTION_SECTIONS.has(navigationSection)
}

const SEARCH_LISTS = ['onhand', 'model-price-history', 'departed', 'harvested'] as const

export type SearchList = (typeof SEARCH_LISTS)[number]

export const SEARCH_LIST_LABELS = {
  onhand: 'On Hand',
  'model-price-history': 'Model Price History',
  departed: 'Departed',
  harvested: 'Harvested',
} as const satisfies Record<SearchList, string>

const REPORT_LISTS = new Set<SearchList>(['model-price-history'])

export function listBasePath(list: SearchList): string {
  return REPORT_LISTS.has(list) ? '/reports' : '/search'
}

const SEARCH_LIST_PATH_INDEX = 2

export function getSearchList(pathname: string): SearchList | null {
  const candidate = pathname.split('/')[SEARCH_LIST_PATH_INDEX]
  return SEARCH_LISTS.includes(candidate as SearchList) ? (candidate as SearchList) : null
}

export function queryStringFrom(filters: URLSearchParams): string {
  const query = filters.toString()
  return query ? `?${query}` : ''
}

const ASSET_DETAIL_BASE_PATH = '/assets'

export function assetDetailHref(barcode: string): string {
  return `${ASSET_DETAIL_BASE_PATH}/${barcode}`
}

export function searchListAssetDetailHref(
  list: SearchList,
  barcode: string,
  filters: URLSearchParams,
): string {
  return `${listBasePath(list)}/${list}/${barcode}${queryStringFrom(filters)}`
}

export function collectionDetailHref(
  section: NavigationSection,
  collectionId: string,
  filters: URLSearchParams,
): string {
  return `/${section}/${collectionId}${queryStringFrom(filters)}`
}

export function collectionAssetHref(
  section: NavigationSection,
  collectionId: string,
  barcode: string,
  filters: URLSearchParams,
): string {
  return `/${section}/${collectionId}/${barcode}${queryStringFrom(filters)}`
}
