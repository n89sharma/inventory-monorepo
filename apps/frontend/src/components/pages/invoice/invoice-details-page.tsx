import { InvoiceSummaryStrip } from '@/components/custom/cards/invoice-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getInvoiceHistory } from '@/data/api/invoice-api'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { invoiceDetailKey, useInvoiceDetail } from '@/hooks/use-invoice'
import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { EditInvoiceMetadataModal } from '../../modals/edit-invoice-metadata-modal'
import { DataTable } from '../../shadcn/data-table'
import { useCan } from '@/hooks/use-can'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function InvoiceDetailsPage(): React.JSX.Element {
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()
  if (invoiceNumber === undefined) throw new Error('Missing collectionId parameter')

  const { state } = useLocation()
  const mutations = useInvoiceMutations()
  const canEditInvoice = useCan('create_update_invoice')
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)

  const columns = useMemo(
    () => createAssetSummaryColumns(
      'invoices',
      invoiceNumber,
      asset => mutations.removeAsset(invoiceNumber, asset)
    ),
    [invoiceNumber, mutations]
  )
  const { data: invoice, error: detailError, isLoading: detailLoading } = useInvoiceDetail(invoiceNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    return () => mutations.flushPending(invoiceNumber)
  }, [invoiceNumber, mutations])

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
            onEdit={() => setIsMetadataModalOpen(true)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="Customer" value={invoice.customer.name} />
            <SummaryField label="Date" value={formatDate(invoice.created_at)} />
            <SummaryField label="Type" value={invoice.invoice_type.type} />
          </div>
        }
      />
      <PageContent className={`flex flex-col gap-4 ${selectedAssets.length > 0 ? 'pb-24' : ''}`}>
      <InvoiceSummaryStrip invoice={invoice} />
      <EditInvoiceMetadataModal
        open={isMetadataModalOpen}
        onOpenChange={setIsMetadataModalOpen}
        invoice={invoice}
        onSave={metadata => mutations.updateMetadata(invoiceNumber, metadata)}
      />
      {canEditInvoice && (
        <AddAssetBar
          existingAssets={invoice.assets}
          entityName='invoice'
          onAddSingle={asset => mutations.addAsset(invoiceNumber, asset)}
        />
      )}
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={invoiceDetailKey(invoiceNumber)}
        currentCollectionType="invoices"
        returnTo={`/invoices/${invoiceNumber}`}
        onBulkRemove={assets => mutations.bulkRemoveAssets(invoiceNumber, assets)}
        totalCount={invoice.assets.length}
        onSelectAll={() => setRowSelection(Object.fromEntries(invoice.assets.map(a => [a.barcode, true])))}
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
