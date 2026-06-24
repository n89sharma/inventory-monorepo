import type { BreadcrumbSegment } from '@/components/custom/breadcrumb-segments'
import { CopyButton } from '@/components/custom/copy-button'
import { PageBreadcrumbToTitle } from '@/components/custom/page-breadcrumb'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'

type StickyDetailsPageHeaderProps = {
  breadcrumbSegments: BreadcrumbSegment[]
  actions: React.ReactNode
  subtitle?: React.ReactNode
} & (
  | { title: string; copyValue: string; titleNode?: never }
  | { titleNode: React.ReactNode; title?: never; copyValue?: never }
)

export function StickyDetailsPageHeader(props: StickyDetailsPageHeaderProps): React.JSX.Element {
  const { breadcrumbSegments, actions, subtitle } = props
  return (
    <StickyPageHeader>
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
    </StickyPageHeader>
  )
}
