import { useAssetStore } from '@/data/store/asset-store'
import { useCan } from '@/hooks/use-can'
import { downloadFile } from '@/lib/download-file'
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
import { type AssetSummary, type CollectionHistory } from 'shared-types'
import { toast } from 'sonner'
import { PendingIcon } from '@/components/shared/pending-icon'
import { AlertDialogDescription } from '../shadcn/alert-dialog'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'
import { DeleteEntityDialog } from '../shared/delete-entity-dialog'
import { ShareButton } from '../shared/share-button'
import {
  buildInvoiceCostReportColumns,
  collectionDetailToCsv,
  type CollectionSection,
} from '../table-columns/collection-detail-report-columns'
import { CollectionHistorySheet } from './collection-history-sheet'

const BARCODE_PRINT_SECTION = 'arrivals'
const MAX_EXPORT_ASSETS = 2000
const CSV_MIME_TYPE = 'text/csv'

type CollectionEditBarProps = {
  section: CollectionSection
  collectionId: string
  canCreateEditEntity: boolean
  assets?: AssetSummary[]
  selectedAssets?: AssetSummary[]
  historyCacheKey: string
  historyFetcher: () => Promise<CollectionHistory>
  onEdit: () => void
  onRelease?: () => void
}

export function CollectionEditBar({
  section,
  collectionId,
  canCreateEditEntity,
  assets,
  selectedAssets,
  historyCacheKey,
  historyFetcher,
  onEdit,
  onRelease,
}: CollectionEditBarProps): React.JSX.Element {
  const canDelete = useCan('delete_collection')
  const canViewPurchasePrice = useCan('view_purchase_price')
  const canViewSalePrice = useCan('view_sale_price')

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

    if (exportableAssets.length > MAX_EXPORT_ASSETS) {
      toast.error(
        `Cannot export ${exportableAssets.length} assets. Please select ${MAX_EXPORT_ASSETS} assets or less`,
        { position: 'top-center' },
      )
      return
    }

    const extraReportColumns =
      section === 'invoices'
        ? buildInvoiceCostReportColumns({ canViewPurchasePrice, canViewSalePrice })
        : []

    setExportLoading(true)
    try {
      await waitForNextPaint()
      const csv = collectionDetailToCsv(section, exportableAssets, extraReportColumns)
      downloadFile(`${section}-${collectionId}.csv`, new Blob([csv], { type: CSV_MIME_TYPE }))
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  async function handlePrint() {
    if (!printableBarcodes || printableBarcodes.length === 0) return

    if (printableBarcodes.length > MAX_EXPORT_ASSETS) {
      toast.error(
        `Cannot print ${printableBarcodes.length} barcodes. Please select ${MAX_EXPORT_ASSETS} assets or less`,
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
  const showDelete = !onRelease && canDelete

  return (
    <div className="flex gap-2 print:hidden">
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
      {canCreateEditEntity && (
        <Button onClick={onEdit}>
          <PencilSimpleIcon />
          Edit
        </Button>
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
                <LockSimpleOpenIcon />
                Release
              </DropdownMenuItem>
            )}
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
        entityId={collectionId}
      >
        <AlertDialogDescription>
          This does not delete the underlying assets present in the collection.
        </AlertDialogDescription>
      </DeleteEntityDialog>
    </div>
  )
}
