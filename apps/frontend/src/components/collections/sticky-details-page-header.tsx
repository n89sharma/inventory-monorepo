import { GridPageHeader, StickyPageHeader } from '@/components/app-layout/sticky-page-header'
import type { BreadcrumbSegment } from '@/components/shared/breadcrumb-segments'
import { CopyButton } from '@/components/shared/copy-button'
import { PageBreadcrumbToTitle } from './page-breadcrumb'

type StickyDetailsPageHeaderProps = {
  breadcrumbSegments: BreadcrumbSegment[]
  actions: React.ReactNode
  subtitle?: React.ReactNode
} & (
  | { title: string; copyValue: string; titleNode?: never }
  | { titleNode: React.ReactNode; title?: never; copyValue?: never }
)

function DetailsPageHeaderContent(props: StickyDetailsPageHeaderProps): React.JSX.Element {
  const { breadcrumbSegments, actions, subtitle } = props
  return (
    <>
      {breadcrumbSegments.length > 0 ? (
        <PageBreadcrumbToTitle segments={breadcrumbSegments} />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        {props.titleNode ?? (
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            {props.title}
            <CopyButton value={props.copyValue} />
          </h1>
        )}
        {actions}
      </div>
      {subtitle && <div className="text-sm">{subtitle}</div>}
    </>
  )
}

// For a detail page whose body is gutter'd.
export function StickyDetailsPageHeader(props: StickyDetailsPageHeaderProps): React.JSX.Element {
  return (
    <StickyPageHeader>
      <DetailsPageHeaderContent {...props} />
    </StickyPageHeader>
  )
}

// For a detail page whose body is a grid running the full width.
export function GridDetailsPageHeader(props: StickyDetailsPageHeaderProps): React.JSX.Element {
  return (
    <GridPageHeader>
      <DetailsPageHeaderContent {...props} />
    </GridPageHeader>
  )
}
