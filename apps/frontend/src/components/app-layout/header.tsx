import { GlobalSearch } from '@/components/global-search/global-search'
import { getEnvHeaderBg } from '@/lib/environment'
import { cn } from '@/lib/utils'

const HEADER_HEIGHT_PROPERTY = '--app-header-height'

// Declared outside the component so its identity is stable: React re-runs a ref
// callback whenever the function changes, which would rebuild the observer on
// every render.
function trackHeaderHeight(el: HTMLElement) {
  const writeHeight = () => {
    const h = el.getBoundingClientRect().height
    document.documentElement.style.setProperty(HEADER_HEIGHT_PROPERTY, `${h}px`)
  }
  writeHeight()
  const observer = new ResizeObserver(writeHeight)
  observer.observe(el)
  return () => observer.disconnect()
}

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps): React.JSX.Element {
  return (
    <header
      ref={trackHeaderHeight}
      className={cn(
        'flex flex-row items-center justify-center px-4 py-2 gap-4 border-b',
        className,
        getEnvHeaderBg(),
      )}
    >
      <GlobalSearch />
    </header>
  )
}
