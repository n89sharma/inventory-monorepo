import { TransferSummaryStrip } from '@/components/custom/cards/transfer-summary-strip'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useTransferDetail } from '@/hooks/use-transfer-detail'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function TransferDetailsPage(): React.JSX.Element {
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (transferNumber === undefined) throw new Error('Missing collectionId/transferNumber parameter')

  const columns = useMemo(() => createAssetSummaryColumns('transfers', transferNumber), [transferNumber])
  const { data: transfer, error: detailError, isLoading: detailLoading } = useTransferDetail(transferNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('transfers', pathname)
  }, [transferNumber])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!transfer) return <div>Transfer not found</div>

  const selectedAssets = transfer.assets.filter(a => rowSelection[a.barcode])

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('transfers', transferNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Transfer {transferNumber}</h1>
        <CollectionEditBar section="transfers" collectionId={transferNumber} assets={transfer.assets} />
      </div>
      <TransferSummaryStrip transfer={transfer} />
      <BulkEditBar selectedAssets={selectedAssets} onClear={() => setRowSelection({})} />
      <DataTable
        columns={columns}
        data={transfer.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
      />
    </div>
  )
}
