import { GridPageHeader, StickyPageHeader } from '@/components/app-layout/sticky-page-header'
import type { BreadcrumbSegment } from '@/components/shared/breadcrumb-segments'
import { CopyButton } from '@/components/shared/copy-button'
import { PageBreadcrumbToTitle } from './page-breadcrumb'

type StickyDetailsPageHeaderProps = {
  breadcrumbSegments: BreadcrumbSegment[]
  actions: React.ReactNode
  subtitle?: React.ReactNode
  titleBadge?: React.ReactNode
} & (
  | { title: string; copyValue: string; titleNode?: never }
  | { titleNode: React.ReactNode; title?: never; copyValue?: never }
)

function DetailsPageHeaderContent(props: StickyDetailsPageHeaderProps): React.JSX.Element {
  const { breadcrumbSegments, actions, subtitle, titleBadge } = props
  return (
    // Breadcrumb and title stack in the left column while the actions span both rows on the
    // right, so the icon buttons cannot stretch the row the breadcrumb sits in.
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
      <div className="min-w-0">
        {breadcrumbSegments.length > 0 ? (
          <PageBreadcrumbToTitle segments={breadcrumbSegments} />
        ) : null}
      </div>
      <div className="row-span-2 self-start justify-self-end">{actions}</div>
      {props.titleNode ?? (
        <h1 className="text-2xl font-semibold group flex items-center gap-2">
          {props.title}
          <CopyButton value={props.copyValue} />
          {titleBadge}
        </h1>
      )}
      {subtitle && <div className="col-span-2 text-sm">{subtitle}</div>}
    </div>
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
