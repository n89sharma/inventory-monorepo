import { cn } from '@/lib/utils'

const DETAILS_HEADER_HEIGHT_PROPERTY = '--details-header-height'

const HEADER_BAR = 'sticky top-0 z-20 bg-background border-b'
const HEADER_INNER = 'w-full px-4 pt-4 pb-3 flex flex-col gap-2'
const HEADER_GUTTER = 'max-w-7xl mx-auto'

// Declared outside the component so its identity is stable: React re-runs a ref
// callback whenever the function changes, which would rebuild the observer on
// every render. The property is removed on detach because the pages that read it
// fall back to 0px, and a stale height would offset them against a header that
// is no longer on screen.
function trackDetailsHeaderHeight(el: HTMLDivElement) {
  const root = document.documentElement
  const writeHeight = () => {
    root.style.setProperty(DETAILS_HEADER_HEIGHT_PROPERTY, `${el.offsetHeight}px`)
  }
  writeHeight()
  const observer = new ResizeObserver(writeHeight)
  observer.observe(el)
  return () => {
    observer.disconnect()
    root.style.removeProperty(DETAILS_HEADER_HEIGHT_PROPERTY)
  }
}

type PageHeaderProps = {
  children: React.ReactNode
}

function PageHeaderBar({
  children,
  innerClassName,
}: PageHeaderProps & { innerClassName?: string }): React.JSX.Element {
  return (
    <div ref={trackDetailsHeaderHeight} className={HEADER_BAR}>
      <div className={cn(HEADER_INNER, innerClassName)}>{children}</div>
    </div>
  )
}

// Centred on the same column as PageContent, for a page whose body is gutter'd.
export function StickyPageHeader({ children }: PageHeaderProps): React.JSX.Element {
  return <PageHeaderBar innerClassName={HEADER_GUTTER}>{children}</PageHeaderBar>
}

// Runs the full width, for a page whose body is a grid that does the same. A gutter'd
// header over an edge-to-edge grid reads as two different pages.
export function GridPageHeader({ children }: PageHeaderProps): React.JSX.Element {
  return <PageHeaderBar>{children}</PageHeaderBar>
}
