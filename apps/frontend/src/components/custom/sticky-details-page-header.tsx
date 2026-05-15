import { CopyButton } from '@/components/custom/copy-button'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'

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
    <div className="sticky top-[var(--app-header-height)] z-10 bg-background border-b">
      <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-3 flex flex-col gap-2">
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
      </div>
    </div>
  )
}
