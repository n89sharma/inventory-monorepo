import { useCan } from '@/hooks/use-can'
import { CurrencyDollarIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { AddToCollectionModal } from '../modals/add-to-collection-modal'
import { BulkEditPricingModal } from '../modals/bulk-edit-pricing-modal'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'
import { useSidebar } from '../shadcn/sidebar'

type CollectionType = 'transfers' | 'departures' | 'holds' | 'invoices' | 'arrivals'

type BulkEditBarProps = {
  selectedAssets: AssetSummary[]
  onClear: () => void
  onPriceSaveSuccess?: () => void
  refreshKey?: string
  currentCollectionType?: CollectionType
  returnTo?: string
  totalCount?: number
  onSelectAll?: () => void
  onBulkRemove?: (assets: AssetSummary[]) => void
}

export function BulkEditBar({
  selectedAssets,
  onClear,
  onPriceSaveSuccess,
  refreshKey,
  currentCollectionType,
  returnTo,
  totalCount,
  onSelectAll,
  onBulkRemove,
}: BulkEditBarProps): React.JSX.Element {
  const navigate = useNavigate()
  const { state: sidebarState, isMobile } = useSidebar()
  const sidebarVisible = !isMobile && sidebarState === 'expanded'
  const barLeft = sidebarVisible
    ? 'calc(50% + var(--sidebar-width) / 2)'
    : '50%'
  const [addToOpen, setAddToOpen] = useState(false)
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false)
  const [assets, setAssets] = useState<AssetSummary[]>([])

  const canCreateTransfer = useCan('create_update_transfer')
  const canCreateDeparture = useCan('create_update_departure')
  const canCreateHold = useCan('create_update_hold')
  const canCreateInvoice = useCan('create_update_invoice')
  const canCreateArrival = useCan('create_update_arrival')
  const canEditPrices = useCan('edit_prices')

  const collectionPermissionMap = {
    transfers: canCreateTransfer,
    departures: canCreateDeparture,
    holds: canCreateHold,
    invoices: canCreateInvoice,
    arrivals: canCreateArrival
  } as const satisfies Record<CollectionType, boolean>

  const canRemoveFromCollection = currentCollectionType !== undefined
    && collectionPermissionMap[currentCollectionType]
  const showBulkRemove = onBulkRemove !== undefined && canRemoveFromCollection
  const canCreateAnyCollection = canCreateTransfer || canCreateDeparture || canCreateHold || canCreateInvoice

  function handleBulkRemove() {
    if (!onBulkRemove) return
    onBulkRemove(selectedAssets)
    onClear()
  }

  const selectedCount = selectedAssets.length
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

  function openAddTo() {
    setAssets(selectedAssets)
    setAddToOpen(true)
  }

  function openBulkPricing() {
    setAssets(selectedAssets)
    setBulkPricingOpen(true)
  }

  function createNewCollection(route: string) {
    navigate(route, { state: { preloadedAssets: selectedAssets, returnTo } })
  }

  return (
    <>
      {hasSelection && createPortal(
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
            {canCreateAnyCollection && (
              <DropdownMenu>
                <Button asChild variant="default">
                  <DropdownMenuTrigger>
                    <PlusIcon />Create
                  </DropdownMenuTrigger>
                </Button>
                <DropdownMenuContent className="w-max" side="top" align="end">
                  {currentCollectionType !== 'transfers' && canCreateTransfer && <DropdownMenuItem key='transfers' onSelect={() => createNewCollection('/transfers/new')}>Transfer</DropdownMenuItem>}
                  {currentCollectionType !== 'departures' && canCreateDeparture && <DropdownMenuItem key='departures' onSelect={() => createNewCollection('/departures/new')}>Departure</DropdownMenuItem>}
                  {currentCollectionType !== 'holds' && canCreateHold && <DropdownMenuItem key='holds' onSelect={() => createNewCollection('/holds/new')}>Hold</DropdownMenuItem>}
                  {currentCollectionType !== 'invoices' && canCreateInvoice && <DropdownMenuItem key='invoices' onSelect={() => createNewCollection('/invoices/new')}>Invoice</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canCreateAnyCollection && (
              <Button variant="secondary" onClick={openAddTo}>Add to</Button>
            )}
            {canEditPrices && (
              <Button variant="secondary" onClick={openBulkPricing}>
                <CurrencyDollarIcon />Edit prices
              </Button>
            )}
            {showBulkRemove && (
              <Button variant="destructive" className="ml-6" onClick={handleBulkRemove}>
                <TrashIcon />Remove
              </Button>
            )}
          </div>
        </div>,
        document.getElementById('main-content') ?? document.body,
      )}
      <AddToCollectionModal
        open={addToOpen}
        onOpenChange={setAddToOpen}
        selectedAssets={assets}
        onConfirmSuccess={onClear}
        refreshKey={refreshKey}
      />
      <BulkEditPricingModal
        open={bulkPricingOpen}
        onOpenChange={setBulkPricingOpen}
        selectedAssets={assets}
        onSaveSuccess={() => { onClear(); onPriceSaveSuccess?.() }}
      />
    </>
  )
}
