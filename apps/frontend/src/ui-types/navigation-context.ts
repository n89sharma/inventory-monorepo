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

const SEARCH_LISTS = ['onhand', 'all', 'sold-report', 'sold'] as const

export type SearchList = (typeof SEARCH_LISTS)[number]

export const SEARCH_LIST_LABELS = {
  onhand: 'On Hand',
  all: 'All Assets',
  'sold-report': 'Sold Report',
  sold: 'Sold',
} as const satisfies Record<SearchList, string>

const REPORT_LISTS = new Set<SearchList>(['sold-report'])

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

export function assetDetailHref(
  list: SearchList,
  barcode: string,
  filters: URLSearchParams,
): string {
  const query = filters.toString()
  const queryString = query ? `?${query}` : ''
  return `${listBasePath(list)}/${list}/${barcode}${queryString}`
}

export function collectionDetailHref(
  section: NavigationSection,
  collectionId: string,
  filters: URLSearchParams,
): string {
  const query = filters.toString()
  const queryString = query ? `?${query}` : ''
  return `/${section}/${collectionId}${queryString}`
}
