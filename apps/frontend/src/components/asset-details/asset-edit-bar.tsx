import { useAssetStore } from '@/data/store/asset-store'
import { useAssetDetail } from '@/hooks/use-asset-detail'
import { useCan } from '@/hooks/use-can'
import {
  BarcodeIcon,
  DotsThreeVerticalIcon,
  MapPinIcon,
  PlusIcon,
  PrinterIcon,
  SpinnerGapIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { assetDetailsToSummary, type Permission } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'
import { AddToCollectionModal } from '../shared-collection-components/add-to-collection-modal'
import { DeleteEntityDialog } from '../shared/delete-entity-dialog'
import { ShareButton } from '../shared/share-button'
import { EditLocationModal } from './edit-location-modal'

const COLLECTION_PERMISSIONS: Permission[] = [
  'create_update_transfer',
  'create_update_departure',
  'create_update_hold',
  'create_update_invoice',
]

export function AssetEditBar({ barcode }: { barcode: string }): React.JSX.Element {
  const { data } = useAssetDetail(barcode)
  const assetDetails = data?.assetDetails ?? null
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false)

  const printBarcodes = useAssetStore((state) => state.printBarcodes)
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

  const canEditLocation = can('edit_location')
  const canCreateSomeCollections = COLLECTION_PERMISSIONS.some((p) => can(p))
  const canDelete = can('delete_asset')

  return (
    <div className="flex gap-2 print:hidden">
      <ShareButton />
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrint}
        disabled={printLoading}
        aria-label="Print barcode"
      >
        {printLoading ? <SpinnerGapIcon className="animate-spin" /> : <BarcodeIcon />}
      </Button>
      <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="Print page">
        <PrinterIcon />
      </Button>
      {canEditLocation && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setEditLocationOpen(true)}
          aria-label="Edit location"
        >
          <MapPinIcon />
        </Button>
      )}
      {canCreateSomeCollections && (
        <Button onClick={() => setAddToCollectionOpen(true)} disabled={!assetSummaries}>
          <PlusIcon />
          Collection
        </Button>
      )}
      {canDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="More options">
              <DotsThreeVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <TrashIcon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <EditLocationModal
        open={editLocationOpen}
        onOpenChange={setEditLocationOpen}
        assetDetails={assetDetails}
      />

      <AddToCollectionModal
        open={addToCollectionOpen}
        onOpenChange={setAddToCollectionOpen}
        selectedAssets={assetSummaries ? [assetSummaries] : []}
        onConfirmSuccess={() => {}}
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
