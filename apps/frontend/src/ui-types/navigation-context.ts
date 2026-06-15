const NAVIGATION_SECTIONS = [
  'arrivals', 'departures', 'transfers', 'invoices', 'holds', 'search', 'home'
] as const

export type NavigationSection = typeof NAVIGATION_SECTIONS[number]

export function isCollection(navigationSection: NavigationSection) {
  return navigationSection !== 'search' && navigationSection !== 'home'
}

const SEARCH_LISTS = ['instock', 'all', 'price-check', 'sold'] as const

export type SearchList = typeof SEARCH_LISTS[number]

export const SEARCH_LIST_LABELS = {
  instock: 'In Stock',
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

export function assetDetailHref(
  list: SearchList,
  barcode: string,
  filters: URLSearchParams,
): string {
  const query = filters.toString()
  return `/search/${list}/${barcode}${query ? `?${query}` : ''}`
}
