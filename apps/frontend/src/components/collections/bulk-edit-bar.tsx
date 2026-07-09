import { useCan } from '@/hooks/use-can'
import { CurrencyDollarIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { BulkEditPricingModal } from './bulk-edit-pricing-modal'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'
import { AddToCollectionModal } from './add-to-collection-modal'
import { BulkActionBar } from './bulk-action-bar'

type CollectionType = 'transfers' | 'departures' | 'holds' | 'invoices' | 'arrivals'

type BulkEditBarProps = {
  selectedAssets: AssetSummary[]
  onClear: () => void
  onPriceSaveSuccess?: () => void
  refreshKey?: string
  currentCollectionType?: CollectionType
  returnTo?: string
  totalCount?: number
  hiddenCount?: number
  onSelectAll?: () => void
  onBulkRemove?: (assets: AssetSummary[]) => void
  extraActions?: React.ReactNode
}

export function BulkEditBar({
  selectedAssets,
  onClear,
  onPriceSaveSuccess,
  refreshKey,
  currentCollectionType,
  returnTo,
  totalCount,
  hiddenCount,
  onSelectAll,
  onBulkRemove,
  extraActions,
}: BulkEditBarProps): React.JSX.Element {
  const navigate = useNavigate()
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
    arrivals: canCreateArrival,
  } as const satisfies Record<CollectionType, boolean>

  const canRemoveFromCollection =
    currentCollectionType !== undefined && collectionPermissionMap[currentCollectionType]
  const showBulkRemove = onBulkRemove !== undefined && canRemoveFromCollection
  const canCreateAnyCollection =
    canCreateTransfer || canCreateDeparture || canCreateHold || canCreateInvoice

  function handleBulkRemove() {
    if (!onBulkRemove) return
    onBulkRemove(selectedAssets)
    onClear()
  }

  const selectedCount = selectedAssets.length

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
      <BulkActionBar
        selectedCount={selectedCount}
        totalCount={totalCount}
        hiddenCount={hiddenCount}
        onSelectAll={onSelectAll}
        onClear={onClear}
      >
        {extraActions}
        {canCreateAnyCollection && (
          <DropdownMenu>
            <Button asChild variant="default">
              <DropdownMenuTrigger>
                <PlusIcon />
                Create
              </DropdownMenuTrigger>
            </Button>
            <DropdownMenuContent className="w-max" side="top" align="end">
              {currentCollectionType !== 'transfers' && canCreateTransfer && (
                <DropdownMenuItem
                  key="transfers"
                  onSelect={() => createNewCollection('/transfers/new')}
                >
                  Transfer
                </DropdownMenuItem>
              )}
              {currentCollectionType !== 'departures' && canCreateDeparture && (
                <DropdownMenuItem
                  key="departures"
                  onSelect={() => createNewCollection('/departures/new')}
                >
                  Departure
                </DropdownMenuItem>
              )}
              {currentCollectionType !== 'holds' && canCreateHold && (
                <DropdownMenuItem key="holds" onSelect={() => createNewCollection('/holds/new')}>
                  Hold
                </DropdownMenuItem>
              )}
              {currentCollectionType !== 'invoices' && canCreateInvoice && (
                <DropdownMenuItem
                  key="invoices"
                  onSelect={() => createNewCollection('/invoices/new')}
                >
                  Invoice
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canCreateAnyCollection && (
          <Button variant="secondary" onClick={openAddTo}>
            Add to
          </Button>
        )}
        {canEditPrices && (
          <Button variant="secondary" onClick={openBulkPricing}>
            <CurrencyDollarIcon />
            Edit prices
          </Button>
        )}
        {showBulkRemove && (
          <Button variant="destructive" className="ml-6" onClick={handleBulkRemove}>
            <TrashIcon />
            Remove
          </Button>
        )}
      </BulkActionBar>
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
        onSaveSuccess={() => {
          onClear()
          onPriceSaveSuccess?.()
        }}
      />
    </>
  )
}
