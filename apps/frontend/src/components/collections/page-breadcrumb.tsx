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
import type { BreadcrumbSegment } from '@/components/shared/breadcrumb-segments'

function BreadcrumbSegmentLabel({ segment }: { segment: BreadcrumbSegment }): React.JSX.Element {
  if (!segment.href) return <BreadcrumbPage>{segment.label}</BreadcrumbPage>
  return (
    <BreadcrumbLink asChild>
      <Link to={segment.href}>{segment.label}</Link>
    </BreadcrumbLink>
  )
}

// Used by detail headers: trailing caret points into the page title below the breadcrumb.
export function PageBreadcrumbToTitle({
  segments,
}: {
  segments: BreadcrumbSegment[]
}): React.JSX.Element {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              <BreadcrumbSegmentLabel segment={seg} />
            </BreadcrumbItem>
          </React.Fragment>
        ))}
        <BreadcrumbSeparator />
      </BreadcrumbList>
    </Breadcrumb>
  )
}
