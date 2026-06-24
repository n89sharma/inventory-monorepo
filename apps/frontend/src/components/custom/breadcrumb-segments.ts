import {
  isCollection,
  SEARCH_LIST_LABELS,
  type NavigationSection,
  type SearchList,
} from '@/ui-types/navigation-context'
import { formatTitleCase } from '@/lib/formatters'

export interface BreadcrumbSegment {
  label: string
  href?: string
}

const DEFAULT_SEARCH_LIST: SearchList = 'all'

export function getBreadcrumForAssetDetails(
  section: NavigationSection,
  collectionId: string | null,
  searchList: SearchList | null,
  listSearch: string,
): BreadcrumbSegment[] {

  if (isCollection(section)) {
    return [
      { label: formatTitleCase(section), href: `/${section}` },
      { label: collectionId ?? '', href: `/${section}/${collectionId}` }
    ]
  }

  if (section === 'search') {
    const list = searchList ?? DEFAULT_SEARCH_LIST
    return [
      { label: SEARCH_LIST_LABELS[list], href: `/search/${list}${listSearch}` }
    ]
  }
  return [
    { label: 'Home', href: '/' }
  ]
}

export function getBreadcrumbForAssetSummary(
  section: NavigationSection): BreadcrumbSegment[] {

  return [
    { label: formatTitleCase(section), href: `/${section}` }
  ]
}
