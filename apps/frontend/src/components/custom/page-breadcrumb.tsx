import React from 'react'
import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn/breadcrumb'
import {
  isCollection,
  SEARCH_LIST_LABELS,
  type NavigationSection,
  type SearchList,
} from '@/ui-types/navigation-context'
import { formatSentenceCase } from '@/lib/formatters'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface PageBreadcrumbProps {
  segments: BreadcrumbSegment[]
  onNavigate?: (href: string) => void
}

interface BreadcrumbBaseProps extends PageBreadcrumbProps {
  trailingSeparator: boolean
}

function BreadcrumbBase({
  segments,
  onNavigate,
  trailingSeparator,
}: BreadcrumbBaseProps): React.JSX.Element {
  function renderLink(href: string, label: string) {
    if (!onNavigate) {
      return <BreadcrumbLink asChild><Link to={href}>{label}</Link></BreadcrumbLink>
    }
    return (
      <BreadcrumbLink asChild>
        <Link
          to={href}
          onClick={e => { e.preventDefault(); onNavigate(href) }}
        >
          {label}
        </Link>
      </BreadcrumbLink>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {seg.href
                ? renderLink(seg.href, seg.label)
                : <BreadcrumbPage>{seg.label}</BreadcrumbPage>
              }
            </BreadcrumbItem>
          </React.Fragment>
        ))}
        {trailingSeparator ? <BreadcrumbSeparator /> : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// Used by edit/create headers: the final segment is the current page, fully shown.
export function PageBreadcrumb(props: PageBreadcrumbProps): React.JSX.Element {
  return <BreadcrumbBase {...props} trailingSeparator={false} />
}

// Used by detail headers: trailing caret points into the page title below the breadcrumb.
export function PageBreadcrumbToTitle(props: PageBreadcrumbProps): React.JSX.Element {
  return <BreadcrumbBase {...props} trailingSeparator={true} />
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
      { label: formatSentenceCase(section), href: `/${section}` },
      { label: collectionId ?? '', href: `/${section}/${collectionId}` }
    ]
  }

  switch (section) {
    case 'search': {
      const list = searchList ?? DEFAULT_SEARCH_LIST
      return [
        { label: SEARCH_LIST_LABELS[list], href: `/search/${list}${listSearch}` }
      ]
    }
    default:
      return [
        { label: 'Home', href: '/' }
      ]
  }
}

export function getBreadcrumbForAssetSummary(
  section: NavigationSection): BreadcrumbSegment[] {

  return [
    { label: formatSentenceCase(section), href: `/${section}` }
  ]
}
