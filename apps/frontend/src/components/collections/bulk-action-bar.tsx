import { XIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../shadcn/button'
import { useSidebar } from '../shadcn/sidebar'

const CLEAR_SELECTION_LABEL = 'Clear selection'
export const BULK_ACTION_BAR_CLEARANCE_CLASS = 'pb-[66px]'
const DEFAULT_ITEM_NOUN = 'asset'

type BulkActionBarProps = {
  selectedCount: number
  totalCount?: number
  hiddenCount?: number
  onSelectAll?: () => void
  onClear: () => void
  itemNoun?: string
  children?: React.ReactNode
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  hiddenCount,
  onSelectAll,
  onClear,
  itemNoun = DEFAULT_ITEM_NOUN,
  children,
}: BulkActionBarProps): React.ReactNode {
  const { state: sidebarState, isMobile } = useSidebar()
  const sidebarVisible = !isMobile && sidebarState === 'expanded'
  const barLeft = sidebarVisible ? 'calc(50% + var(--sidebar-width) / 2)' : '50%'

  const hasSelection = selectedCount > 0
  const hasHidden = hiddenCount !== undefined && hiddenCount > 0
  const canShowSelectAll =
    totalCount !== undefined && onSelectAll !== undefined && selectedCount < totalCount

  function getCountLabel() {
    if (totalCount === undefined) {
      return `${selectedCount} ${itemNoun}${selectedCount !== 1 ? 's' : ''} selected`
    }
    if (selectedCount === totalCount) {
      return hasHidden
        ? `All ${totalCount} shown selected`
        : `All ${totalCount} ${itemNoun}s selected`
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
      className="fixed bottom-2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in-0 duration-50 ease-in-out transition-[left] motion-safe:duration-200"
      style={{ left: barLeft }}
      role="region"
      aria-label="Bulk edit actions"
    >
      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg">
        <span aria-live="polite">{getCountLabel()}</span>
        {hasHidden && <span className="text-muted-foreground">{hiddenCount} hidden by filter</span>}
        {canShowSelectAll && (
          <Button variant="ghost" onClick={onSelectAll}>
            Select all
          </Button>
        )}
        {children}
        <Button variant="ghost" size="icon" aria-label={CLEAR_SELECTION_LABEL} onClick={onClear}>
          <XIcon />
        </Button>
      </div>
    </div>,
    document.getElementById('main-content') ?? document.body,
  )
}
