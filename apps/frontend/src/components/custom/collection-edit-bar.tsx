import { exportAssets } from '@/data/api/asset-api'
import { DotsThreeVerticalIcon, DownloadSimpleIcon, PencilSimpleIcon, SpinnerGapIcon, TrashIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Link } from "react-router-dom"
import type { AssetSummary } from "shared-types"
import { toast } from "sonner"
import { AlertDialogDescription } from "../shadcn/alert-dialog"
import { Button } from "../shadcn/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../shadcn/dropdown-menu"
import { BulkEditPricingModal } from "../modals/bulk-edit-pricing-modal"
import { DeleteEntityDialog } from "./delete-entity-dialog"
import { ShareButton } from "./share-button"

type CollectionEditBarProps = {
  section: string
  collectionId: string
  assets?: AssetSummary[]
}

export function CollectionEditBar({
  section,
  collectionId,
  assets,
}: CollectionEditBarProps): React.JSX.Element {

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false)

  const barcodes = assets?.map(a => a.barcode)

  async function handleExport() {
    if (!barcodes || barcodes.length === 0) return

    if (barcodes.length > 2000) {
      toast.error('Please select 2000 assets or less', { position: 'top-center' })
      return
    }

    setExportLoading(true)
    try {
      await exportAssets(barcodes, `${section}-${collectionId}.csv`)
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  const exportDisabled = !barcodes || barcodes.length === 0 || exportLoading

  return (
    <div className="flex gap-2">
      <ShareButton />
      {assets !== undefined && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleExport}
          disabled={exportDisabled}
          aria-label="Export to CSV"
        >
          {exportLoading
            ? <SpinnerGapIcon className="animate-spin" />
            : <DownloadSimpleIcon />}
        </Button>
      )}
      <Button asChild>
        <Link to={`/${section}/${collectionId}/edit`}><PencilSimpleIcon />Edit</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label="More options">
            <DotsThreeVerticalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setBulkPricingOpen(true)}>
            Bulk edit pricing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <TrashIcon />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity={section}
        entityId={collectionId}
      >
        <AlertDialogDescription>
          This does not delete the underlying assets present in the collection.
        </AlertDialogDescription>
      </DeleteEntityDialog>
      <BulkEditPricingModal
        open={bulkPricingOpen}
        onOpenChange={setBulkPricingOpen}
        selectedAssets={assets ?? []}
        onSaveSuccess={() => setBulkPricingOpen(false)}
      />
    </div>
  )
}
