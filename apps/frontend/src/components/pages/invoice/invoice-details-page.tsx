import { InvoiceSummaryStrip } from '@/components/custom/cards/invoice-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getInvoiceHistory } from '@/data/api/invoice-api'
import { formatDate, formatTitleCase } from '@/lib/formatters'
import { invoiceDetailKey, useInvoiceDetail } from '@/hooks/use-invoice'
import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { INVOICE_TYPE, type AssetSummary } from 'shared-types'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { EditInvoiceMetadataModal } from '../../modals/edit-invoice-metadata-modal'
import { CollectionDetailPage } from '../collection-detail-page'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function InvoiceDetailsPage(): React.JSX.Element {
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()
  if (invoiceNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useInvoiceMutations()
  const detail = useInvoiceDetail(invoiceNumber)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createAssetSummaryColumns(assetHref, asset => mutations.removeAsset(invoiceNumber, asset)),
    [mutations, invoiceNumber],
  )

  return (
    <CollectionDetailPage
      section="invoices"
      titleLabel="Invoice"
      collectionId={invoiceNumber}
      permission="create_update_invoice"
      detail={detail}
      notFoundLabel="Invoice not found"
      refreshKey={invoiceDetailKey(invoiceNumber)}
      historyCacheKey={`invoice-history:${invoiceNumber}`}
      historyFetcher={() => getInvoiceHistory(invoiceNumber)}
      onBulkRemove={assets => mutations.bulkRemoveAssets(invoiceNumber, assets)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      renderSummaryStrip={invoice => <InvoiceSummaryStrip invoice={invoice} />}
      renderSubtitle={invoice => (
        <>
          <SummaryField
            label={invoice.invoice_type.type === INVOICE_TYPE.sales ? 'Customer' : 'Vendor'}
            value={invoice.customer.name}
          />
          <SummaryField label="Reference" value={invoice.invoice_reference} />
          <SummaryField label="Date" value={formatDate(invoice.created_at)} />
          <SummaryField label="Type" value={formatTitleCase(invoice.invoice_type.type)} />
        </>
      )}
      renderMetadataModal={(invoice, control) => (
        <EditInvoiceMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          invoice={invoice}
          onSave={metadata => mutations.updateMetadata(invoiceNumber, metadata)}
        />
      )}
      renderAddAssetBar={invoice => (
        <AddAssetBar
          existingAssets={invoice.assets}
          entityName='invoice'
          onAddSingle={asset => mutations.addAsset(invoiceNumber, asset)}
        />
      )}
    />
  )
}
