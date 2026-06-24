import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../shadcn/button'
import { useSidebar } from '../shadcn/sidebar'

type BulkActionBarProps = {
  selectedCount: number
  totalCount?: number
  onSelectAll?: () => void
  onClear: () => void
  children?: React.ReactNode
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  children,
}: BulkActionBarProps): React.ReactNode {
  const { state: sidebarState, isMobile } = useSidebar()
  const sidebarVisible = !isMobile && sidebarState === 'expanded'
  const barLeft = sidebarVisible ? 'calc(50% + var(--sidebar-width) / 2)' : '50%'

  const hasSelection = selectedCount > 0
  const canShowSelectAll =
    totalCount !== undefined && onSelectAll !== undefined && selectedCount < totalCount

  function getCountLabel() {
    if (totalCount === undefined) {
      return `${selectedCount} asset${selectedCount !== 1 ? 's' : ''} selected`
    }
    if (selectedCount === totalCount) {
      return `All ${totalCount} assets selected`
    }
    return `${selectedCount} of ${totalCount} selected`
  }

  useEffect(() => {
    if (!hasSelection) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClear()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasSelection, onClear])

  if (!hasSelection) return null

  return createPortal(
    <div
      className="fixed bottom-4 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in-0 duration-50 ease-in-out transition-[left] motion-safe:duration-200"
      style={{ left: barLeft }}
      role="region"
      aria-label="Bulk edit actions"
    >
      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg">
        <span aria-live="polite">{getCountLabel()}</span>
        {canShowSelectAll && (
          <Button variant="ghost" onClick={onSelectAll}>
            Select all
          </Button>
        )}
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
        {children}
      </div>
    </div>,
    document.getElementById('main-content') ?? document.body,
  )
}
