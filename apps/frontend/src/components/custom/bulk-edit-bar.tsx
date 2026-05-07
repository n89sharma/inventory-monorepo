import { PencilSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
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

type BulkEditBarProps = {
  selectedAssets: AssetSummary[]
  onClear: () => void
  onPriceSaveSuccess?: () => void
}

export function BulkEditBar({
  selectedAssets,
  onClear,
  onPriceSaveSuccess,
}: BulkEditBarProps): React.JSX.Element {
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
