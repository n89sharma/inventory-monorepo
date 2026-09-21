import { useAssetStore } from '@/data/store/asset-store'
import { useCan } from '@/hooks/use-can'
import { downloadFile, toFilenameStem } from '@/lib/download-file'
import { waitForNextPaint } from '@/lib/wait-for-next-paint'
import {
  BarcodeIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  LockSimpleOpenIcon,
  PencilSimpleIcon,
  PrinterIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { MAX_BULK_ASSET_COUNT, type AssetSearchRow, type CollectionHistory } from 'shared-types'
import { toast } from 'sonner'
import { PendingIcon } from '@/components/shared/pending-icon'
import { AlertDialogDescription } from '../shadcn/alert-dialog'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'
import { DeleteEntityDialog } from '../shared/delete-entity-dialog'
import { ShareButton } from '../shared/share-button'
import { type CollectionSection } from '../table-columns/collection-detail-columns'
import { searchPageRowsToCsv } from '../table-columns/search-page-report-columns'
import { CollectionHistorySheet } from './collection-history-sheet'
import { CollectionNoteButton } from './collection-note-button'

const BARCODE_PRINT_SECTION = 'arrivals'
const CSV_MIME_TYPE = 'text/csv'

export type CollectionMenuAction = {
  label: string
  icon?: React.ReactNode
  onSelect: () => void
}

type CollectionEditBarProps = {
  section: CollectionSection
  collectionId: string
  displayId: string
  canCreateEditEntity: boolean
  assets?: AssetSearchRow[]
  selectedAssets?: AssetSearchRow[]
  visibleColumns: Set<string>
  note?: string | null
  menuActions?: CollectionMenuAction[]
  historyCacheKey: string
  historyFetcher: () => Promise<CollectionHistory>
  onEdit: () => void
  onRelease?: () => void
  onDelete?: () => void
}

export function CollectionEditBar({
  section,
  collectionId,
  displayId,
  canCreateEditEntity,
  assets,
  selectedAssets,
  visibleColumns,
  note,
  menuActions,
  historyCacheKey,
  historyFetcher,
  onEdit,
  onRelease,
  onDelete,
}: CollectionEditBarProps): React.JSX.Element {
  const canDelete = useCan('delete_collection')

  const printBarcodes = useAssetStore((state) => state.printBarcodes)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)

  const exportableAssets = selectedAssets?.length ? selectedAssets : assets
  const printableBarcodes = (selectedAssets?.length ? selectedAssets : assets)?.map(
    (a) => a.barcode,
  )

  async function handleExport() {
    if (!exportableAssets || exportableAssets.length === 0) return

    if (exportableAssets.length > MAX_BULK_ASSET_COUNT) {
      toast.error(
        `Cannot export ${exportableAssets.length} assets. Please select ${MAX_BULK_ASSET_COUNT} assets or less`,
        { position: 'top-center' },
      )
      return
    }

    setExportLoading(true)
    try {
      await waitForNextPaint()
      const csv = searchPageRowsToCsv(exportableAssets, visibleColumns)
      downloadFile(
        `${section}-${toFilenameStem(displayId, collectionId)}.csv`,
        new Blob([csv], { type: CSV_MIME_TYPE }),
      )
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  async function handlePrint() {
    if (!printableBarcodes || printableBarcodes.length === 0) return

    if (printableBarcodes.length > MAX_BULK_ASSET_COUNT) {
      toast.error(
        `Cannot print ${printableBarcodes.length} barcodes. Please select ${MAX_BULK_ASSET_COUNT} assets or less`,
        { position: 'top-center' },
      )
      return
    }

    setPrintLoading(true)
    try {
      await printBarcodes(printableBarcodes)
    } catch {
      toast.error('Failed to print barcodes', { position: 'top-center' })
    } finally {
      setPrintLoading(false)
    }
  }

  const exportDisabled = !exportableAssets || exportableAssets.length === 0 || exportLoading
  const showPrint = section === BARCODE_PRINT_SECTION
  const printDisabled = !printableBarcodes || printableBarcodes.length === 0 || printLoading

  const showRelease = canCreateEditEntity && Boolean(onRelease)
  const showDelete = canDelete && Boolean(onDelete)
  const showSeparator = showDelete && (canCreateEditEntity || showRelease)

  return (
    <div className="flex gap-2 print:hidden">
      <CollectionNoteButton note={note} />
      <CollectionHistorySheet cacheKey={historyCacheKey} fetcher={historyFetcher} />
      <ShareButton />
      {assets !== undefined && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleExport}
          disabled={exportDisabled}
          aria-label="Export to CSV"
        >
          <PendingIcon pending={exportLoading}>
            <DownloadSimpleIcon />
          </PendingIcon>
        </Button>
      )}
      {showPrint && (
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrint}
          disabled={printDisabled}
          aria-label="Print barcodes"
        >
          <PendingIcon pending={printLoading}>
            <BarcodeIcon />
          </PendingIcon>
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="Print page">
        <PrinterIcon />
      </Button>
      {(canCreateEditEntity || showDelete || menuActions?.length) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="More options">
              <DotsThreeVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto">
            {canCreateEditEntity && (
              <DropdownMenuItem onSelect={onEdit}>
                <PencilSimpleIcon />
                Edit
              </DropdownMenuItem>
            )}
            {menuActions?.map((action) => (
              <DropdownMenuItem key={action.label} onSelect={action.onSelect}>
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
            {showRelease && (
              <DropdownMenuItem variant="destructive" onSelect={onRelease}>
                <LockSimpleOpenIcon />
                Release
              </DropdownMenuItem>
            )}
            {showSeparator && <DropdownMenuSeparator />}
            {showDelete && (
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <TrashIcon />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity={section}
        entityId={displayId}
        onConfirm={onDelete}
      >
        <AlertDialogDescription>
          This permanently removes the record. It cannot be undone.
        </AlertDialogDescription>
      </DeleteEntityDialog>
    </div>
  )
}
