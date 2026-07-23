import { EditInvoiceMetadataModal } from '@/components/invoice/edit-invoice-metadata-modal'
import { InvoiceSummaryStrip } from '@/components/invoice/invoice-summary-strip'
import { createInvoiceAssetSummaryColumns } from '@/components/table-columns/asset-summary-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { getInvoiceHistory } from '@/data/api/invoice-api'
import { invoiceDetailKey, useInvoiceDetail } from '@/hooks/use-invoice'
import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import { useCan } from '@/hooks/use-can'
import { formatDate, formatTitleCase } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { INVOICE_TYPE, type AssetSummary } from 'shared-types'

export function InvoiceDetailsPage(): React.JSX.Element {
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()
  if (invoiceNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useInvoiceMutations()
  const detail = useInvoiceDetail(invoiceNumber)
  const canCreateEditInvoice = useCan('create_update_invoice')
  const canViewPurchasePrice = useCan('view_purchase_price')
  const canViewSalePrice = useCan('view_sale_price')

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createInvoiceAssetSummaryColumns(
        assetHref,
        (asset) => mutations.removeAsset(invoiceNumber, asset),
        canViewPurchasePrice,
        canViewSalePrice,
      ),
    [mutations, invoiceNumber, canViewPurchasePrice, canViewSalePrice],
  )

  return (
    <CollectionDetailPage
      section="invoices"
      titleLabel="Invoice"
      collectionId={invoiceNumber}
      canCreateEditEntity={canCreateEditInvoice}
      detail={detail}
      notFoundLabel="Invoice not found"
      refreshKey={invoiceDetailKey(invoiceNumber)}
      historyCacheKey={`invoice-history:${invoiceNumber}`}
      historyFetcher={() => getInvoiceHistory(invoiceNumber)}
      onBulkRemove={(assets) => mutations.bulkRemoveAssets(invoiceNumber, assets)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      renderTitle={(invoice) => ({
        title: `Invoice ${invoice.invoice_reference}`,
        copyValue: invoice.invoice_reference,
      })}
      renderSummaryStrip={(invoice) => (
        <InvoiceSummaryStrip
          invoice={invoice}
          canViewPurchasePrice={canViewPurchasePrice}
          canViewSalePrice={canViewSalePrice}
        />
      )}
      renderSubtitle={(invoice) => (
        <>
          <SummaryField
            label={invoice.invoice_type.type === INVOICE_TYPE.sales ? 'Customer' : 'Vendor'}
            value={invoice.customer.name}
          />
          <SummaryField label="System Invoice Number" value={invoiceNumber} />
          <SummaryField label="Date" value={formatDate(parseISO(invoice.invoice_date))} />
          <SummaryField label="Type" value={formatTitleCase(invoice.invoice_type.type)} />
        </>
      )}
      renderMetadataModal={(invoice, control) => (
        <EditInvoiceMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          invoice={invoice}
          onSave={(metadata) => mutations.updateMetadata(invoiceNumber, metadata)}
        />
      )}
      renderAddAssetBar={(invoice) =>
        canCreateEditInvoice && (
          <AddAssetBar
            existingAssets={invoice.assets}
            entityName="invoice"
            onAddSingle={(asset) => mutations.addAsset(invoiceNumber, asset)}
          />
        )
      }
    />
  )
}
