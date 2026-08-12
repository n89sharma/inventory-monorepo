import {
  isCollection,
  listBasePath,
  SEARCH_LIST_LABELS,
  type NavigationSection,
  type SearchList,
} from '@/ui-types/navigation-context'
import { formatTitleCase } from '@/lib/formatters'

export interface BreadcrumbSegment {
  label: string
  href?: string
}

export function getBreadcrumForAssetDetails(
  section: NavigationSection,
  collectionId: string | null,
  searchList: SearchList | null,
  listSearch: string,
): BreadcrumbSegment[] {
  if (isCollection(section)) {
    return [
      { label: formatTitleCase(section), href: `/${section}` },
      { label: collectionId ?? '', href: `/${section}/${collectionId}${listSearch}` },
    ]
  }

  if (section === 'assets') return []

  if (section === 'search' && searchList) {
    return [
      {
        label: SEARCH_LIST_LABELS[searchList],
        href: `${listBasePath(searchList)}/${searchList}${listSearch}`,
      },
    ]
  }
  return [{ label: 'Home', href: '/' }]
}

export function getBreadcrumbForAssetSummary(
  section: NavigationSection,
  listSearch: string,
): BreadcrumbSegment[] {
  return [{ label: formatTitleCase(section), href: `/${section}${listSearch}` }]
}
