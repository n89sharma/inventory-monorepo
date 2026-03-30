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
import { isCollection, type NavigationSection } from '@/ui-types/navigation-context'
import { formatSentenceCase } from '@/lib/formatters'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface PageBreadcrumbProps {
  segments: BreadcrumbSegment[]
}

export function PageBreadcrumb({ segments }: PageBreadcrumbProps): React.JSX.Element {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          return (
            <React.Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast
                  ? <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                  : <BreadcrumbLink asChild><Link to={seg.href!}>{seg.label}</Link></BreadcrumbLink>
                }
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function getBreadcrumForAssetDetails(
  section: NavigationSection,
  collectionId: string | null,
  assetId: string): BreadcrumbSegment[] {


  if (isCollection(section)) {
    return [
      { label: formatSentenceCase(section), href: `/${section}` },
      { label: collectionId ?? '', href: `/${section}/${collectionId}` },
      { label: assetId }
    ]
  }

  switch (section) {
    case 'search':
      return [
        { label: 'Search', href: '/search' },
        { label: assetId }
      ]
    default:
      return [
        { label: 'Home', href: '/' },
        { label: assetId }
      ]
  }
}

export function getBreadcrumbForAssetSummary(
  section: NavigationSection,
  collectionId: string | null): BreadcrumbSegment[] {

  return [
    { label: formatSentenceCase(section), href: `/${section}` },
    { label: collectionId ?? '' }
  ]
}
