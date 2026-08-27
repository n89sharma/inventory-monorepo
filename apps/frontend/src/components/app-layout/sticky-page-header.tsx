const DETAILS_HEADER_HEIGHT_PROPERTY = '--details-header-height'

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

type StickyPageHeaderProps = {
  children: React.ReactNode
}

export function StickyPageHeader({ children }: StickyPageHeaderProps): React.JSX.Element {
  return (
    <div ref={trackDetailsHeaderHeight} className="sticky top-0 z-20 bg-background border-b">
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 pb-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}
