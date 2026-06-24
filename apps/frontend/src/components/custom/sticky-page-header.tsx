import { useEffect, useRef } from 'react'

type StickyPageHeaderProps = {
  children: React.ReactNode
}

export function StickyPageHeader({ children }: StickyPageHeaderProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty('--details-header-height', `${el.offsetHeight}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--details-header-height')
    }
  }, [])

  return (
    <div ref={ref} className="sticky top-[var(--app-header-height)] z-10 bg-background border-b">
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 pb-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}
