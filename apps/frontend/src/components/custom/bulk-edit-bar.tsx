import { useCan } from '@/hooks/use-can'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { AddToCollectionModal } from '../modals/add-to-collection-modal'
import { BulkEditPricingModal } from '../modals/bulk-edit-pricing-modal'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'

type CollectionType = 'transfers' | 'departures' | 'holds' | 'invoices' | 'arrivals'

type BulkEditBarProps = {
  selectedAssets: AssetSummary[]
  onClear: () => void
  onPriceSaveSuccess?: () => void
  refreshKey?: string
  currentCollectionType?: CollectionType
  returnTo?: string
}

export function BulkEditBar({
  selectedAssets,
  onClear,
  onPriceSaveSuccess,
  refreshKey,
  currentCollectionType,
  returnTo,
}: BulkEditBarProps): React.JSX.Element {
  const navigate = useNavigate()
  const [addToOpen, setAddToOpen] = useState(false)
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false)
  const [assets, setAssets] = useState<AssetSummary[]>([])

  const canCreateTransfer = useCan('create_update_transfer')
  const canCreateDeparture = useCan('create_update_departure')
  const canCreateHold = useCan('create_update_hold')
  const canCreateInvoice = useCan('create_update_invoice')
  const canEditPrices = useCan('edit_prices')

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
      <div className="flex items-center min-h-9 gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
        {selectedCount > 0 ? (
          <>
            {selectedCount} asset{selectedCount !== 1 ? 's' : ''} selected
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
            {(canCreateTransfer || canCreateDeparture || canCreateHold || canCreateInvoice) &&
              <DropdownMenu>
                <Button asChild variant="secondary">
                  <DropdownMenuTrigger>
                    <PencilSimpleIcon />Bulk Edit
                  </DropdownMenuTrigger>
                </Button>
                <DropdownMenuContent>
                  {canEditPrices && <DropdownMenuItem onSelect={openBulkPricing}>Prices</DropdownMenuItem>}

                  <DropdownMenuItem onSelect={openAddTo}>Add to collection</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Create new collection</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {currentCollectionType !== 'transfers' && canCreateTransfer && <DropdownMenuItem key='transfers' onSelect={() => createNewCollection('/transfers/new')}>Transfer</DropdownMenuItem>}
                      {currentCollectionType !== 'departures' && canCreateDeparture && <DropdownMenuItem key='departures' onSelect={() => createNewCollection('/departures/new')}>Departure</DropdownMenuItem>}
                      {currentCollectionType !== 'holds' && canCreateHold && <DropdownMenuItem key='holds' onSelect={() => createNewCollection('/holds/new')}>Hold</DropdownMenuItem>}
                      {currentCollectionType !== 'invoices' && canCreateInvoice && <DropdownMenuItem key='invoices' onSelect={() => createNewCollection('/invoices/new')}>Invoice</DropdownMenuItem>}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                </DropdownMenuContent>
              </DropdownMenu>
            }
          </>
        ) : (
          <span>Make a selection for bulk editing</span>
        )}
      </div>
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
