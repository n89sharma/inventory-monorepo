import { ArrivalLinks } from '@/components/shared/arrival-links'
import { CreatedByField } from '@/components/shared/cards/created-by-field'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import { EditInvoiceMetadataModal } from '@/components/invoice/edit-invoice-metadata-modal'
import { invoiceCounterpartyWarning } from '@/components/invoice/invoice-counterparty-mismatch'
import { SummaryValue } from '@/components/shared/cards/summary-value'
import { InvoiceClearedBadge } from '@/components/invoice/invoice-cleared-badge'
import { InvoiceRoute } from '@/components/invoice/invoice-route'
import { InvoiceTransporters } from '@/components/invoice/invoice-transporters'
import { InvoiceTypeBadge } from '@/components/invoice/invoice-type-badge'
import type { AssetWarningOf } from '@/components/table-columns/asset-search-columns'
import { createCollectionDetailColumns } from '@/components/table-columns/collection-detail-columns'
import { getInvoiceHistory } from '@/data/api/invoice-api'
import { useCan } from '@/hooks/use-can'
import { invoiceDetailKey, useInvoiceDetail } from '@/hooks/use-invoice'
import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import { useEntityDelete } from '@/hooks/use-entity-delete'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { formatDate } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetSearchRow, PatchAssetPricing } from 'shared-types'

const ARRIVAL_LINK_LIMIT = 3

export function InvoiceDetailsPage(): React.JSX.Element {
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()
  if (invoiceNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useInvoiceMutations()
  const detail = useInvoiceDetail(invoiceNumber)
  const counterpartyWarning = useMemo(
    () => (detail.data ? invoiceCounterpartyWarning(detail.data) : null),
    [detail.data],
  )
  const canCreateEditInvoice = useCan('create_update_invoice')
  const can = useCan()
  const savePrice = useCallback(
    (barcode: string, patch: PatchAssetPricing) =>
      mutations.updatePrice(invoiceNumber, barcode, patch),
    [mutations, invoiceNumber],
  )
  const { priceEditorRegistry, tableMeta } = usePriceCellEditing(savePrice)
  const handleDelete = useEntityDelete(
    'Invoice',
    invoiceNumber,
    detail.data?.invoice_reference ?? invoiceNumber,
    mutations.remove,
  )

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSearchRow) => string, assetWarningOf: AssetWarningOf) =>
      createCollectionDetailColumns({
        getHref: assetHref,
        assetWarningOf,
        can,
        priceEditorRegistry,
      }),
    [can, priceEditorRegistry],
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
      onDelete={handleDelete}
      buildColumns={buildColumns}
      counterpartyWarning={counterpartyWarning}
      tableMeta={tableMeta}
      renderTitle={(invoice) => ({
        title: `Invoice ${invoice.invoice_reference}`,
        copyValue: invoice.invoice_reference,
      })}
      getNote={(invoice) => invoice.notes}
      renderTitleBadge={(invoice) => (
        <>
          <InvoiceTypeBadge type={invoice.invoice_type.type} />
          <InvoiceClearedBadge cleared={invoice.is_cleared} />
        </>
      )}
      renderSummaryStrip={(invoice) => (
        <>
          <SummaryValue value={formatDate(parseISO(invoice.invoice_date))} />
          <InvoiceRoute invoice={invoice} />
          <InvoiceTransporters arrivals={invoice.arrivals} />
          <ArrivalLinks
            arrivalNumbers={invoice.arrivals.map((a) => a.arrival_number)}
            limit={ARRIVAL_LINK_LIMIT}
          />
          <CreatedByField value={invoice.created_by.name} />
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
