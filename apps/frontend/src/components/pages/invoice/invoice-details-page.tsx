import { InvoiceSummaryStrip } from '@/components/custom/cards/invoice-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getInvoiceHistory } from '@/data/api/invoice-api'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { invoiceDetailKey, useInvoiceDetail } from '@/hooks/use-invoice-detail'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
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
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary('invoices', invoiceNumber)}
        title={`Invoice ${invoiceNumber}`}
        copyValue={invoiceNumber}
        actions={
          <CollectionEditBar
            section="invoices"
            collectionId={invoiceNumber}
            assets={invoice.assets}
            historyCacheKey={`invoice-history:${invoiceNumber}`}
            historyFetcher={() => getInvoiceHistory(invoiceNumber)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="Customer" value={invoice.customer.name} />
            <SummaryField label="Date" value={formatDate(invoice.created_at)} />
            <SummaryField label="Type" value={invoice.invoice_type} />
          </div>
        }
      />
      <PageContent className="flex flex-col gap-4">
      <InvoiceSummaryStrip invoice={invoice} />
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={invoiceDetailKey(invoiceNumber)}
        currentCollectionType="invoices"
        returnTo={`/invoices/${invoiceNumber}`}
      />
      <DataTable
        columns={columns}
        data={invoice.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
        defaultSort={{ id: 'barcode', desc: true }}
      />
      </PageContent>
    </>
  )
}
