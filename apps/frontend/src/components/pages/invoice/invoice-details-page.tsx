import { InvoiceSummaryStrip } from '@/components/custom/cards/invoice-summary-strip'
import { CollectionHistorySection } from '@/components/custom/collection-history-section'
import { getInvoiceHistory } from '@/data/api/invoice-api'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { invoiceDetailKey, useInvoiceDetail } from '@/hooks/use-invoice-detail'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { CopyButton } from '../../custom/copy-button'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function InvoiceDetailsPage(): React.JSX.Element {
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (invoiceNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('invoices', invoiceNumber), [invoiceNumber])
  const { data: invoice, error: detailError, isLoading: detailLoading } = useInvoiceDetail(invoiceNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('invoices', pathname)
  }, [invoiceNumber])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!invoice) return <div>Invoice not found</div>

  const selectedAssets = invoice.assets.filter(a => rowSelection[a.barcode])

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('invoices', invoiceNumber)} />
      <div className="flex items-center justify-between">
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            Invoice {invoiceNumber}
            <CopyButton value={invoiceNumber} />
          </h1>
        </div>
        <CollectionEditBar section="invoices" collectionId={invoiceNumber} assets={invoice.assets} />
      </div>
      <InvoiceSummaryStrip invoice={invoice} />
      <BulkEditBar selectedAssets={selectedAssets} onClear={() => setRowSelection({})} refreshKey={invoiceDetailKey(invoiceNumber)} />
      <DataTable
        columns={columns}
        data={invoice.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
      />
      <CollectionHistorySection
        cacheKey={`invoice-history:${invoiceNumber}`}
        fetcher={() => getInvoiceHistory(invoiceNumber)}
      />
    </div>
  )
}
