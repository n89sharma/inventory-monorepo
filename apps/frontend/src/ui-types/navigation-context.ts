export type NavigationSection =
  | 'arrivals'
  | 'departures'
  | 'transfers'
  | 'invoices'
  | 'holds'
  | 'search'
  | 'home'

export function isCollection(navigationSection: NavigationSection) {
  return navigationSection !== 'search' && navigationSection !== 'home'
}

const SEARCH_LISTS = ['onhand', 'all', 'model-price-history', 'departed', 'harvested'] as const

export type SearchList = (typeof SEARCH_LISTS)[number]

export const SEARCH_LIST_LABELS = {
  onhand: 'On Hand',
  all: 'All Assets',
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

export const FROM_GLOBAL_SEARCH_STATE = { fromGlobalSearch: true } as const

export function isFromGlobalSearch(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'fromGlobalSearch' in state &&
    (state as { fromGlobalSearch: unknown }).fromGlobalSearch === true
  )
}

export function queryStringFrom(filters: URLSearchParams): string {
  const query = filters.toString()
  return query ? `?${query}` : ''
}

export function assetDetailHref(
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
