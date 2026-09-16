import { useCan } from '@/hooks/use-can'
import type { InvoicePrefill } from '@/ui-types/invoice-form-types'
import { CaretDownIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { BulkEditPricingModal } from './bulk-edit-pricing-modal'
import { Button } from '../shadcn/button'
import { Separator } from '../shadcn/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'
import { AddToCollectionModal } from './add-to-collection-modal'
import { BulkActionBar } from './bulk-action-bar'

type CollectionType = 'transfers' | 'departures' | 'holds' | 'invoices' | 'arrivals'

const NEW_COLLECTION_OPTIONS = [
  { collectionType: 'transfers', label: 'Transfer', route: '/transfers/new' },
  { collectionType: 'departures', label: 'Departure', route: '/departures/new' },
  { collectionType: 'holds', label: 'Hold', route: '/holds/new' },
  { collectionType: 'invoices', label: 'Invoice', route: '/invoices/new' },
] as const satisfies readonly { collectionType: CollectionType; label: string; route: string }[]

const EXISTING_COLLECTION_LABEL = 'Existing collection…'
const NEW_COLLECTION_HEADING = 'New'

export type BulkExtraAction = {
  label: string
  onSelect: () => void
  blockedReason?: string
}

export type BulkExtraActionGroup = {
  heading?: string
  actions: BulkExtraAction[]
}

// The bar clears the selection on a window-level Escape; without this, dismissing a menu would
// also discard what the user just selected.
function stopEscapePropagation(event: KeyboardEvent) {
  event.stopPropagation()
}

function BulkExtraActionItem({ action }: { action: BulkExtraAction }): React.JSX.Element {
  if (action.blockedReason !== undefined) {
    return (
      <DropdownMenuItem disabled className="flex-col items-start gap-0.5">
        <span>{action.label}</span>
        <span className="text-xs">{action.blockedReason}</span>
      </DropdownMenuItem>
    )
  }
  return <DropdownMenuItem onSelect={action.onSelect}>{action.label}</DropdownMenuItem>
}

function BulkExtraActionGroupItems({
  group,
  showSeparator,
}: {
  group: BulkExtraActionGroup
  showSeparator: boolean
}): React.JSX.Element {
  return (
    <>
      {showSeparator && <DropdownMenuSeparator />}
      {group.heading !== undefined && <DropdownMenuLabel>{group.heading}</DropdownMenuLabel>}
      {group.actions.map((action) => (
        <BulkExtraActionItem key={action.label} action={action} />
      ))}
    </>
  )
}

type BulkEditBarProps = {
  selectedAssets: AssetSummary[]
  onClear: () => void
  onPriceSaveSuccess?: () => void
  refreshKey?: string
  currentCollectionType?: CollectionType
  returnTo?: string
  invoicePrefill?: InvoicePrefill
  totalCount?: number
  hiddenCount?: number
  onSelectAll?: () => void
  onBulkRemove?: (assets: AssetSummary[]) => void
  extraActionGroups?: BulkExtraActionGroup[]
  extraDialogs?: React.ReactNode
}

export function BulkEditBar({
  selectedAssets,
  onClear,
  onPriceSaveSuccess,
  refreshKey,
  currentCollectionType,
  returnTo,
  invoicePrefill,
  totalCount,
  hiddenCount,
  onSelectAll,
  onBulkRemove,
  extraActionGroups,
  extraDialogs,
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
  const showBulkPricing = onPriceSaveSuccess !== undefined && canEditPrices
  const canCreateAnyCollection =
    canCreateTransfer || canCreateDeparture || canCreateHold || canCreateInvoice

  const newCollectionOptions = NEW_COLLECTION_OPTIONS.filter(
    (option) =>
      option.collectionType !== currentCollectionType &&
      collectionPermissionMap[option.collectionType],
  )
  const extraGroups = extraActionGroups?.filter((group) => group.actions.length > 0) ?? []

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
    navigate(route, { state: { preloadedAssets: selectedAssets, returnTo, invoicePrefill } })
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
        {canCreateAnyCollection && (
          <DropdownMenu>
            <Button asChild variant="default">
              <DropdownMenuTrigger>
                Add to
                <CaretDownIcon />
              </DropdownMenuTrigger>
            </Button>
            <DropdownMenuContent
              className="w-max"
              side="top"
              align="end"
              onEscapeKeyDown={stopEscapePropagation}
            >
              <DropdownMenuItem onSelect={openAddTo}>{EXISTING_COLLECTION_LABEL}</DropdownMenuItem>
              {newCollectionOptions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{NEW_COLLECTION_HEADING}</DropdownMenuLabel>
                  {newCollectionOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.collectionType}
                      onSelect={() => createNewCollection(option.route)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showBulkPricing && (
          <Button variant="secondary" onClick={openBulkPricing}>
            Edit prices
          </Button>
        )}
        {extraGroups.length > 0 && (
          <DropdownMenu>
            <Button asChild variant="secondary">
              <DropdownMenuTrigger>
                More
                <CaretDownIcon />
              </DropdownMenuTrigger>
            </Button>
            <DropdownMenuContent
              className="w-max"
              side="top"
              align="end"
              onEscapeKeyDown={stopEscapePropagation}
            >
              {extraGroups.map((group, groupIndex) => (
                <BulkExtraActionGroupItems
                  key={group.heading ?? String(groupIndex)}
                  group={group}
                  showSeparator={groupIndex > 0}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showBulkRemove && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Button variant="destructive" onClick={handleBulkRemove}>
              <TrashIcon />
              Remove
            </Button>
          </>
        )}
        {extraDialogs}
      </BulkActionBar>
      <AddToCollectionModal
        open={addToOpen}
        onOpenChange={setAddToOpen}
        selectedAssets={assets}
        onConfirmSuccess={onClear}
        refreshKey={refreshKey}
      />
      {bulkPricingOpen && (
        <BulkEditPricingModal
          onOpenChange={setBulkPricingOpen}
          selectedAssets={assets}
          onSaveSuccess={() => {
            onClear()
            onPriceSaveSuccess?.()
          }}
        />
      )}
    </>
  )
}
