import { useAssetStore } from '@/data/store/asset-store'
import { useCan } from '@/hooks/use-can'
import { DotsThreeVerticalIcon, DownloadSimpleIcon, LockSimpleOpenIcon, PencilSimpleIcon, SpinnerGapIcon, TrashIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { type AssetSummary, type CollectionHistory, type ReportVariant } from "shared-types"
import { toast } from "sonner"
import { AlertDialogDescription } from "../shadcn/alert-dialog"
import { Button } from "../shadcn/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../shadcn/dropdown-menu"
import { CollectionHistorySheet } from "./collection-history-sheet"
import { DeleteEntityDialog } from "./delete-entity-dialog"
import { ShareButton } from "./share-button"

const SECTION_CONFIG = {
  arrivals: { reportVariant: 'arrival_report' },
  transfers: { reportVariant: 'transfer_report' },
  departures: { reportVariant: 'departure_report' },
  holds: { reportVariant: 'hold_report' },
  invoices: { reportVariant: 'invoice_report' },
} as const satisfies Record<string, { reportVariant: ReportVariant }>

type CollectionEditBarProps = {
  section: keyof typeof SECTION_CONFIG
  collectionId: string
  canEdit: boolean
  assets?: AssetSummary[]
  historyCacheKey: string
  historyFetcher: () => Promise<CollectionHistory>
  onEdit: () => void
  onRelease?: () => void
}

export function CollectionEditBar({
  section,
  collectionId,
  canEdit,
  assets,
  historyCacheKey,
  historyFetcher,
  onEdit,
  onRelease,
}: CollectionEditBarProps): React.JSX.Element {

  const canDelete = useCan('delete_collection')

  const exportAssets = useAssetStore(state => state.exportAssets)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const barcodes = assets?.map(a => a.barcode)

  async function handleExport() {
    if (!barcodes || barcodes.length === 0) return

    if (barcodes.length > 2000) {
      toast.error(
        `Cannot export ${barcodes.length} assets. Please select 2000 assets or less`
        , { position: 'top-center' })
      return
    }

    setExportLoading(true)
    try {
      await exportAssets(barcodes, `${section}-${collectionId}.csv`, SECTION_CONFIG[section].reportVariant)
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  const exportDisabled = !barcodes || barcodes.length === 0 || exportLoading

  const showRelease = canEdit && Boolean(onRelease)
  const showDelete = !onRelease && canDelete

  return (
    <div className="flex gap-2">
      <ShareButton />
      <CollectionHistorySheet cacheKey={historyCacheKey} fetcher={historyFetcher} />
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
      {canEdit && (
        <Button onClick={onEdit}><PencilSimpleIcon />Edit</Button>
      )}
      {(showRelease || showDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="More options">
              <DotsThreeVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {showRelease && (
              <DropdownMenuItem variant="destructive" onSelect={onRelease}>
                <LockSimpleOpenIcon />Release
              </DropdownMenuItem>
            )}
            {showDelete && (
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <TrashIcon />Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
    </div>
  )
}
