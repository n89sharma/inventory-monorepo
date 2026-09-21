import { PlusIcon } from '@phosphor-icons/react'
import { OrgName } from '@/components/shared/org-name'
import { InvoiceSummaryField } from '@/components/invoice/invoice-summary-field'
import { salesInvoiceOf } from '@/lib/asset-invoice'
import { CreatedByField } from '@/components/shared/cards/created-by-field'
import { departureCustomerWarning } from '@/components/departure/departure-customer-mismatch'
import type { AssetWarningOf } from '@/components/table-columns/asset-search-columns'
import { EditDepartureMetadataModal } from '@/components/departure/edit-departure-metadata-modal'
import { createCollectionDetailColumns } from '@/components/table-columns/collection-detail-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { AddFromHoldModal } from '@/components/collections/add-from-hold-modal'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import type { BulkExtraAction, BulkExtraActionGroup } from '@/components/collections/bulk-edit-bar'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryRoute } from '@/components/shared/cards/summary-route'
import { SummaryValue } from '@/components/shared/cards/summary-value'
import { ReturnToStockDialog } from '@/components/departure/return-to-stock-dialog'
import { getDepartureHistory } from '@/data/api/departure-api'
import { departureDetailKey, useDepartureDetail } from '@/hooks/use-departure'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useCan } from '@/hooks/use-can'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { formatDate } from '@/lib/formatters'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  INVOICE_TYPE,
  OrgSummarySchema,
  OUTGOING_STATUS_LABELS,
  OutgoingStatusSchema,
  type AssetSearchRow,
  type OutgoingStatus,
  type PatchAssetPricing,
} from 'shared-types'

const OUTGOING_STATUS_OPTIONS = OutgoingStatusSchema.options
const OUTGOING_STATUS_HEADING = 'Set outgoing status'
const RETURN_TO_STOCK_LABEL = 'Return to stock'

function buildOutgoingStatusActions(onApply: (status: OutgoingStatus) => void): BulkExtraAction[] {
  return OUTGOING_STATUS_OPTIONS.map((status) => ({
    label: OUTGOING_STATUS_LABELS[status],
    onSelect: () => onApply(status),
  }))
}

const ADD_FROM_HOLD_LABEL = 'Add Assets from Hold'

export function DepartureDetailsPage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useDepartureMutations()
  const detail = useDepartureDetail(departureNumber)
  const counterpartyWarning = useMemo(
    () => (detail.data ? departureCustomerWarning(detail.data) : null),
    [detail.data],
  )
  const canCreateEditDeparture = useCan('create_update_departure')
  const canReturnToStock = useCan('return_to_stock')
  const can = useCan()
  const [returnToStockOpen, setReturnToStockOpen] = useState(false)

  const savePrice = useCallback(
    (barcode: string, patch: PatchAssetPricing) =>
      mutations.updatePrice(departureNumber, barcode, patch),
    [mutations, departureNumber],
  )
  const { priceEditorRegistry, tableMeta } = usePriceCellEditing(savePrice)
  const [addFromHoldOpen, setAddFromHoldOpen] = useState(false)

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
      section="departures"
      titleLabel="Departure"
      collectionId={departureNumber}
      canCreateEditEntity={canCreateEditDeparture}
      detail={detail}
      notFoundLabel="Departure not found"
      refreshKey={departureDetailKey(departureNumber)}
      historyCacheKey={`departure-history:${departureNumber}`}
      historyFetcher={() => getDepartureHistory(departureNumber)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      counterpartyWarning={counterpartyWarning}
      tableMeta={tableMeta}
      getInvoicePrefill={(departure) => ({
        invoiceType: INVOICE_TYPE.sales,
        organization: OrgSummarySchema.parse(departure.customer),
      })}
      getNote={(departure) => departure.notes}
      renderMenuActions={(departure) => ({
        actions: canCreateEditDeparture
          ? [
              {
                label: ADD_FROM_HOLD_LABEL,
                icon: <PlusIcon />,
                onSelect: () => setAddFromHoldOpen(true),
              },
            ]
          : [],
        dialogs: (
          <AddFromHoldModal
            open={addFromHoldOpen}
            onOpenChange={setAddFromHoldOpen}
            getAssets={() => departure.assets}
            onAddAsset={() => {}}
            onCommitBatch={(assets) => mutations.addAssetBatch(departureNumber, assets)}
          />
        ),
      })}
      renderSummaryStrip={(departure) => (
        <>
          <SummaryValue value={formatDate(departure.created_at)} />
          <SummaryRoute
            from={departure.origin.city_code}
            to={<OrgName name={departure.customer.name} />}
          />
          <SummaryValue value={departure.salesperson?.name} />
          <SummaryValue value={<OrgName name={departure.transporter.name} />} />
          <InvoiceSummaryField assets={departure.assets} getInvoice={salesInvoiceOf} />
          <AssetTotalsField assets={departure.assets} />
          <CreatedByField value={departure.created_by} />
        </>
      )}
      renderMetadataModal={(departure, control) => (
        <EditDepartureMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          departure={departure}
          onSave={(metadata) => mutations.updateMetadata(departureNumber, metadata)}
        />
      )}
      renderAddAssetBar={(departure) =>
        canCreateEditDeparture && (
          <AddAssetBar
            existingAssets={departure.assets}
            entityName="departure"
            onAddSingle={(asset) => mutations.addAsset(departureNumber, asset)}
          />
        )
      }
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => {
        const groups: BulkExtraActionGroup[] = []
        if (canCreateEditDeparture) {
          groups.push({
            heading: OUTGOING_STATUS_HEADING,
            actions: buildOutgoingStatusActions((status) => {
              mutations.setOutgoingStatus(
                departureNumber,
                selectedAssets.map((a) => a.id),
                status,
              )
              clearSelection()
            }),
          })
        }
        if (canReturnToStock) {
          groups.push({
            actions: [{ label: RETURN_TO_STOCK_LABEL, onSelect: () => setReturnToStockOpen(true) }],
          })
        }
        return {
          groups,
          dialogs: canReturnToStock && (
            <ReturnToStockDialog
              assetCount={selectedAssets.length}
              open={returnToStockOpen}
              onOpenChange={setReturnToStockOpen}
              onConfirm={() => {
                mutations.returnToStock(departureNumber, selectedAssets)
                clearSelection()
              }}
            />
          ),
        }
      }}
    />
  )
}
