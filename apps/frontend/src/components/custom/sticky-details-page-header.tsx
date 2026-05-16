import { CopyButton } from '@/components/custom/copy-button'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'

type BreadcrumbSegment = { label: string; href?: string }

type StickyDetailsPageHeaderProps = {
  breadcrumbSegments: BreadcrumbSegment[]
  actions: React.ReactNode
} & (
  | { title: string; copyValue: string; titleNode?: never }
  | { titleNode: React.ReactNode; title?: never; copyValue?: never }
)

export function StickyDetailsPageHeader(
  props: StickyDetailsPageHeaderProps,
): React.JSX.Element {
  const { breadcrumbSegments, actions } = props
  return (
    <StickyPageHeader>
      <PageBreadcrumb segments={breadcrumbSegments} />
      <div className="flex items-center justify-between">
        {props.titleNode ?? (
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            {props.title}
            <CopyButton value={props.copyValue} />
          </h1>
        )}
        {actions}
      </div>
    </StickyPageHeader>
  )
}
