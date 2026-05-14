import { CopyButton } from '@/components/custom/copy-button'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'

type BreadcrumbSegment = { label: string; href?: string }

type StickyDetailsPageHeaderProps = {
  breadcrumbSegments: BreadcrumbSegment[]
  title: string
  copyValue: string
  actions: React.ReactNode
}

export function StickyDetailsPageHeader({
  breadcrumbSegments,
  title,
  copyValue,
  actions,
}: StickyDetailsPageHeaderProps): React.JSX.Element {
  return (
    <div className="sticky top-[var(--app-header-height)] z-10 bg-background -mt-4 pt-4 pb-3 flex flex-col gap-2 shadow-[0_6px_8px_-6px_rgb(0_0_0_/_0.10)]">
      <PageBreadcrumb segments={breadcrumbSegments} />
      <div className="flex items-center justify-between">
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            {title}
            <CopyButton value={copyValue} />
          </h1>
        </div>
        {actions}
      </div>
    </div>
  )
}
