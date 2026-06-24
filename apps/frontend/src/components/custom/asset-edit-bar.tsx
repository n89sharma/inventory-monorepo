import { useAssetStore } from "@/data/store/asset-store"
import { useAssetDetail } from "@/hooks/use-asset-detail"
import { useCan } from "@/hooks/use-can"
import { DotsThreeVerticalIcon, PencilSimpleIcon, PrinterIcon, SpinnerGapIcon, TrashIcon } from "@phosphor-icons/react"
import { Fragment, useState } from "react"
import { assetDetailsToSummary, type Permission } from "shared-types"
import { toast } from "sonner"
import { AddPartModal } from "../modals/add-part-modal"
import { AddToCollectionModal } from "../modals/add-to-collection-modal"
import { EditErrorsModal } from "../modals/edit-errors-modal"
import { EditLocationModal } from "../modals/edit-location-modal"
import { EditPricingModal } from "../modals/edit-pricing-modal"
import { EditSpecsModal } from "../modals/edit-specs-modal"
import { Button } from "../shadcn/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../shadcn/dropdown-menu"
import { DeleteEntityDialog } from "./delete-entity-dialog"
import { ShareButton } from "./share-button"

const COLLECTION_PERMISSIONS: Permission[] = [
  'create_update_transfer',
  'create_update_departure',
  'create_update_hold',
  'create_update_invoice',
]

type MenuItem = {
  key: string
  label: string
  onSelect: () => void
  disabled?: boolean
}

export function AssetEditBar({ barcode }: { barcode: string }): React.JSX.Element {
  const { data } = useAssetDetail(barcode)
  const assetDetails = data?.assetDetails ?? null
  const errors = data?.errors ?? []
  const accessories = data?.accessories ?? []
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editErrorsOpen, setEditErrorsOpen] = useState(false)
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [editPricingOpen, setEditPricingOpen] = useState(false)
  const [editSpecsOpen, setEditSpecsOpen] = useState(false)
  const [addHarvestedPartOpen, setAddHarvestedPartOpen] = useState(false)
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false)

  const printBarcodes = useAssetStore(state => state.printBarcodes)
  const [printLoading, setPrintLoading] = useState(false)

  const assetSummaries = assetDetails ? assetDetailsToSummary(assetDetails) : null
  const can = useCan()

  async function handlePrint() {
    setPrintLoading(true)
    try {
      await printBarcodes([barcode], `${barcode}-barcode.pdf`)
    } catch {
      toast.error('Failed to print barcode', { position: 'top-center' })
    } finally {
      setPrintLoading(false)
    }
  }

  const canEditPrice = can('edit_prices')
  const canEditSpecs = can('edit_tech_specs')
  const canCreateSomeCollections = COLLECTION_PERMISSIONS.some(p => can(p))

  const editGroup: MenuItem[] = [
    canEditPrice && { key: 'pricing', label: 'Pricing', onSelect: () => setEditPricingOpen(true) },
    canEditSpecs && { key: 'specs', label: 'Specifications', onSelect: () => setEditSpecsOpen(true) },
    canEditSpecs && { key: 'errors', label: 'Errors', onSelect: () => setEditErrorsOpen(true) },
    canEditSpecs && { key: 'parts', label: 'Parts', onSelect: () => setAddHarvestedPartOpen(true) },
    canEditSpecs && { key: 'location', label: 'Location', onSelect: () => setEditLocationOpen(true) },
  ].filter((i): i is MenuItem => i !== false)

  const collectionGroup: MenuItem[] = canCreateSomeCollections
    ? [{
      key: 'add-to-collection',
      label: 'Add to Collection',
      onSelect: () => setAddToCollectionOpen(true),
      disabled: !assetSummaries,
    }]
    : []

  const groups = [editGroup, collectionGroup].filter(g => g.length > 0)
  const showEditMenu = groups.length > 0
  const canDelete = can('delete_asset')

  return (
    <div className="flex gap-2">
      <ShareButton />
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrint}
        disabled={printLoading}
        aria-label="Print barcode"
      >
        {printLoading
          ? <SpinnerGapIcon className="animate-spin" />
          : <PrinterIcon />}
      </Button>
      {showEditMenu &&
        <DropdownMenu>
          <Button asChild>
            <DropdownMenuTrigger>
              <PencilSimpleIcon />Edit
            </DropdownMenuTrigger>
          </Button>
          <DropdownMenuContent>
            {groups.map((group, groupIdx) => (
              <Fragment key={groupIdx}>
                {groupIdx > 0 && <DropdownMenuSeparator />}
                {group.map(item => (
                  <DropdownMenuItem
                    key={item.key}
                    disabled={item.disabled}
                    onSelect={item.onSelect}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
      {canDelete &&
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="More options">
              <DotsThreeVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <TrashIcon />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }

      <EditPricingModal
        open={editPricingOpen}
        onOpenChange={setEditPricingOpen}
        assetDetails={assetDetails}
      />

      <EditSpecsModal
        open={editSpecsOpen}
        onOpenChange={setEditSpecsOpen}
        assetDetails={assetDetails}
        accessories={accessories}
      />

      <EditErrorsModal
        open={editErrorsOpen}
        onOpenChange={setEditErrorsOpen}
        assetDetails={assetDetails}
        errors={errors}
      />

      <EditLocationModal
        open={editLocationOpen}
        onOpenChange={setEditLocationOpen}
        assetDetails={assetDetails}
      />

      <AddPartModal
        open={addHarvestedPartOpen}
        onOpenChange={setAddHarvestedPartOpen}
        recipientBarcode={assetDetails?.barcode ?? null}
      />

      <AddToCollectionModal
        open={addToCollectionOpen}
        onOpenChange={setAddToCollectionOpen}
        selectedAssets={assetSummaries ? [assetSummaries] : []}
        onConfirmSuccess={() => { }}
      />

      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity="Asset"
        entityId={assetDetails?.barcode}
      />
    </div>
  )
}
