import { cn } from '@/lib/utils'

const PAGE_GUTTER = 'max-w-7xl mx-auto w-full px-4'

type PageContentProps = {
  children: React.ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps): React.JSX.Element {
  return <div className={cn(PAGE_GUTTER, 'py-4', className)}>{children}</div>
}

// Body of a page whose grid owns the viewport. Carries no gutter and no max width, so the
// grid runs edge to edge and a pinned column sticks to the content edge rather than to the
// gutter. It is a grid page's only child under main, so h-full is exactly the viewport
// remainder, and it hands the grid whatever is left below the page header.
export function GridPageContent({ children, className }: PageContentProps): React.JSX.Element {
  return <div className={cn('flex h-full min-h-0 flex-col', className)}>{children}</div>
}

// Restores the gutter for the parts of a grid page that are not the grid.
export function PageSection({ children, className }: PageContentProps): React.JSX.Element {
  return <div className={cn(PAGE_GUTTER, 'shrink-0 py-2', className)}>{children}</div>
}
