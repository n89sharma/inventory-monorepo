export type NavigationSection =
  | 'arrivals' | 'departures' | 'transfers' | 'invoices' | 'holds' | 'search' | 'home'

export function isCollection(navigationSection: NavigationSection) {
  return navigationSection !== 'search' && navigationSection !== 'home'
}

const SEARCH_LISTS = ['instock', 'held', 'all', 'price-check', 'sold'] as const

export type SearchList = typeof SEARCH_LISTS[number]

export const SEARCH_LIST_LABELS = {
  instock: 'In Stock',
  held: 'Held',
  all: 'All Assets',
  'price-check': 'Price Check',
  sold: 'Sold',
} as const satisfies Record<SearchList, string>

const SEARCH_LIST_PATH_INDEX = 2

export function getSearchList(pathname: string): SearchList | null {
  const candidate = pathname.split('/')[SEARCH_LIST_PATH_INDEX]
  return SEARCH_LISTS.includes(candidate as SearchList)
    ? (candidate as SearchList)
    : null
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
  return `/search/${list}/${barcode}${queryString}`
}
