import { useAssetStore } from "@/data/store/asset-store"
import { DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { AddPartTransferModal } from "../modals/add-part-transfer-modal"
import { EditErrorsModal } from "../modals/edit-errors-modal"
import { Button } from "../shadcn/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../shadcn/dropdown-menu"
import { DeleteEntityDialog } from "./delete-entity-dialog"
import { ShareButton } from "./share-button"

export function AssetEditBar(): React.JSX.Element {
  const assetDetails = useAssetStore(state => state.assetDetails)
  const errors = useAssetStore(state => state.errors)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editErrorsOpen, setEditErrorsOpen] = useState(false)
  const [addPartTransferOpen, setAddPartTransferOpen] = useState(false)

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
          <DropdownMenuItem disabled>Pricing</DropdownMenuItem>
          <DropdownMenuItem disabled>Technical Specs</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditErrorsOpen(true)}>
            Errors
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAddPartTransferOpen(true)}>
            Parts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditErrorsModal
        open={editErrorsOpen}
        onOpenChange={setEditErrorsOpen}
        assetDetails={assetDetails}
        errors={errors}
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
      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity="Asset"
        entityId={assetDetails?.barcode}
      />
    </div>
  )
}
