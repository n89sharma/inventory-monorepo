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

type CollectionType = 'transfer' | 'departure' | 'hold' | 'invoice' | 'arrival'

const CREATE_COLLECTION_TYPES = [
  { type: 'transfer' as CollectionType, label: 'Transfer', route: '/transfers/new' },
  { type: 'departure' as CollectionType, label: 'Departure', route: '/departures/new' },
  { type: 'hold' as CollectionType, label: 'Hold', route: '/holds/new' },
  { type: 'invoice' as CollectionType, label: 'Invoice', route: '/invoices/new' },
]

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

  const newCollectionOptions = CREATE_COLLECTION_TYPES.filter(t => t.type !== currentCollectionType)

  return (
    <>
      <div className="flex items-center min-h-9 gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
        {selectedCount > 0 ? (
          <>
            {selectedCount} asset{selectedCount !== 1 ? 's' : ''} selected
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
            <DropdownMenu>
              <Button asChild variant="secondary">
                <DropdownMenuTrigger>
                  <PencilSimpleIcon />Bulk Edit
                </DropdownMenuTrigger>
              </Button>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={openAddTo}>Add to collection</DropdownMenuItem>
                <DropdownMenuItem onSelect={openBulkPricing}>Prices</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Create new collection</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {newCollectionOptions.map(t => (
                      <DropdownMenuItem key={t.type} onSelect={() => createNewCollection(t.route)}>
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
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
