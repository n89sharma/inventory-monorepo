import { useAssetDetail } from "@/hooks/use-asset-detail"
import { DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { assetDetailsToSummary } from "shared-types"
import { AddPartTransferModal } from "../modals/add-part-transfer-modal"
import { AddToCollectionModal } from "../modals/add-to-collection-modal"
import { EditErrorsModal } from "../modals/edit-errors-modal"
import { EditPricingModal } from "../modals/edit-pricing-modal"
import { Button } from "../shadcn/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../shadcn/dropdown-menu"
import { DeleteEntityDialog } from "./delete-entity-dialog"
import { ShareButton } from "./share-button"

export function AssetEditBar({ barcode }: { barcode: string }): React.JSX.Element {
  const { data } = useAssetDetail(barcode)
  const assetDetails = data?.assetDetails ?? null
  const errors = data?.errors ?? []
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editErrorsOpen, setEditErrorsOpen] = useState(false)
  const [editPricingOpen, setEditPricingOpen] = useState(false)
  const [addPartTransferOpen, setAddPartTransferOpen] = useState(false)
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false)

  const assetAsSummary = assetDetails ? assetDetailsToSummary(assetDetails) : null

  return (
    <div className="flex gap-2">
      <ShareButton />
      <DropdownMenu>
        <Button asChild>
          <DropdownMenuTrigger>
            <PencilSimpleIcon />Edit
          </DropdownMenuTrigger>
        </Button>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setEditPricingOpen(true)}>Pricing</DropdownMenuItem>
          <DropdownMenuItem disabled>Specifications</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditErrorsOpen(true)}>
            Errors
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAddPartTransferOpen(true)}>
            Parts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!assetAsSummary} onSelect={() => setAddToCollectionOpen(true)}>
            Add to Collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditErrorsModal
        open={editErrorsOpen}
        onOpenChange={setEditErrorsOpen}
        assetDetails={assetDetails}
        errors={errors}
      />

      <EditPricingModal
        open={editPricingOpen}
        onOpenChange={setEditPricingOpen}
        assetDetails={assetDetails}
      />

      <AddPartTransferModal
        open={addPartTransferOpen}
        onOpenChange={setAddPartTransferOpen}
        recipientBarcode={assetDetails?.barcode ?? null}
      />



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
      <AddToCollectionModal
        open={addToCollectionOpen}
        onOpenChange={setAddToCollectionOpen}
        selectedAssets={assetAsSummary ? [assetAsSummary] : []}
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
