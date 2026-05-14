import { GlobalSearch } from '@/components/custom/global-search/global-search'
import { cn } from "@/lib/utils"
import { useLayoutEffect, useRef } from "react"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps): React.JSX.Element {
  const headerRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const writeHeight = () => {
      const h = el.getBoundingClientRect().height
      document.documentElement.style.setProperty('--app-header-height', `${h}px`)
    }
    writeHeight()
    const observer = new ResizeObserver(writeHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn("flex flex-row items-center justify-center px-4 py-2 gap-4 border-b", className)}
    >
      <GlobalSearch />
    </header>
  )
}
