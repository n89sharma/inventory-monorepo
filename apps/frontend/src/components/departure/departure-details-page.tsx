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
import {
  COLLECTION_DETAILS_TAB,
  CollectionDetailPage,
  type CollectionExtraTab,
} from '@/components/collections/collection-detail-page'
import type { BulkExtraAction, BulkExtraActionGroup } from '@/components/collections/bulk-edit-bar'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryRoute } from '@/components/shared/cards/summary-route'
import { SummaryValue } from '@/components/shared/cards/summary-value'
import { DepartureLifecycleActions } from '@/components/departure/departure-lifecycle-actions'
import { DepartureLoadingPanel } from '@/components/departure/departure-loading-panel'
import { DepartureStatusBadge } from '@/components/departure/departure-status-badge'
import { ReturnToStockDialog } from '@/components/departure/return-to-stock-dialog'
import { getDepartureHistory } from '@/data/api/departure-api'
import { departureDetailKey, useDepartureDetail } from '@/hooks/use-departure'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useCan } from '@/hooks/use-can'
import { useEntityDelete } from '@/hooks/use-entity-delete'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { formatDate } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ASSET_STATUS,
  DEPARTURE_STATUS,
  INVOICE_TYPE,
  OrgSummarySchema,
  OUTGOING_STATUS_LABELS,
  OutgoingStatusSchema,
  type AssetSearchRow,
  type DepartureAssetRow,
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
const LOADING_TAB = 'loading'

function pendingLoadCountOf(assets: DepartureAssetRow[]): number {
  return assets.filter((asset) => !asset.scan.loaded && asset.status !== ASSET_STATUS.MISSING)
    .length
}

function tabForStatus(status: string): string {
  if (status === DEPARTURE_STATUS.LOADING_IN_PROGRESS) return LOADING_TAB
  return COLLECTION_DETAILS_TAB
}

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
  const canReturnToStock = useCan('update_asset_status')
  const can = useCan()
  const [returnToStockOpen, setReturnToStockOpen] = useState(false)
  const isDraft = detail.data?.status === DEPARTURE_STATUS.DRAFT
  const canEditAssets = canCreateEditDeparture && isDraft
  const loadedAssetIds = useMemo(
    () => new Set((detail.data?.assets ?? []).filter((a) => a.scan.loaded).map((a) => a.id)),
    [detail.data?.assets],
  )

  const [activeTab, setActiveTab] = useState<string>(COLLECTION_DETAILS_TAB)
  const prevStatusRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const currStatus = detail.data?.status
    if (currStatus === undefined) return
    const prevStatus = prevStatusRef.current
    prevStatusRef.current = currStatus
    if (prevStatus !== currStatus) setActiveTab(tabForStatus(currStatus))
  }, [detail.data?.status])

  // Bumped every time the active tab changes, so the Loading scan input remounts and reliably
  // grabs focus each time its tab is entered. Adjusting state during render (not in an effect)
  // per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab)
  const [focusNonce, setFocusNonce] = useState(0)
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab)
    setFocusNonce((n) => n + 1)
  }

  const savePrice = useCallback(
    (barcode: string, patch: PatchAssetPricing) =>
      mutations.updatePrice(departureNumber, barcode, patch),
    [mutations, departureNumber],
  )
  const { priceEditorRegistry, tableMeta } = usePriceCellEditing(savePrice)
  const [addFromHoldOpen, setAddFromHoldOpen] = useState(false)
  const handleDelete = useEntityDelete(
    'Departure',
    departureNumber,
    departureNumber,
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

  const departureTabs: CollectionExtraTab[] = []
  if (detail.data?.status === DEPARTURE_STATUS.LOADING_IN_PROGRESS) {
    departureTabs.push({ value: LOADING_TAB, label: 'Loading' })
  }

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
      tabs={departureTabs}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      renderTabContent={(tabValue, departure) => {
        if (tabValue !== LOADING_TAB) return null
        return (
          <DepartureLoadingPanel
            departureNumber={departureNumber}
            assets={departure.assets}
            focusKey={focusNonce}
          />
        )
      }}
      onBulkRemove={
        canEditAssets ? (assets) => mutations.bulkRemoveAssets(departureNumber, assets) : undefined
      }
      onFlushPending={mutations.flushPending}
      onDelete={handleDelete}
      renderHeaderActions={(departure) => (
        <DepartureLifecycleActions
          status={departure.status}
          assetCount={departure.assets.length}
          pendingLoadCount={pendingLoadCountOf(departure.assets)}
          onSchedule={(departureDate) => mutations.schedule(departureNumber, departureDate)}
          onStartLoading={() => mutations.startLoading(departureNumber)}
          onFinishLoading={() => mutations.finishLoading(departureNumber)}
          onComplete={() => mutations.complete(departureNumber)}
        />
      )}
      renderTitleBadge={(departure) => <DepartureStatusBadge status={departure.status} />}
      buildColumns={buildColumns}
      counterpartyWarning={counterpartyWarning}
      tableMeta={tableMeta}
      getInvoicePrefill={(departure) => ({
        invoiceType: INVOICE_TYPE.sales,
        organization: OrgSummarySchema.parse(departure.customer),
      })}
      getNote={(departure) => departure.notes}
      renderMenuActions={(departure) => ({
        actions: canEditAssets
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
            onCommitBatch={(assets) => mutations.addAssetBatch(departureNumber, assets)}
          />
        ),
      })}
      renderSummaryStrip={(departure) => (
        <>
          <SummaryValue
            value={formatDate(
              departure.departure_date ? parseISO(departure.departure_date) : departure.created_at,
            )}
          />
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
          onSaveNotes={(comment) => mutations.updateNotes(departureNumber, comment)}
          onSaveDate={(departureDate) => mutations.updateDate(departureNumber, departureDate)}
        />
      )}
      renderAddAssetBar={(departure) =>
        canEditAssets && (
          <AddAssetBar
            existingAssets={departure.assets}
            entityName="departure"
            onAddSingle={(asset) => mutations.addAsset(departureNumber, asset)}
          />
        )
      }
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => {
        const groups: BulkExtraActionGroup[] = []
        const returnable = canReturnToStock && selectedAssets.every((a) => loadedAssetIds.has(a.id))
        if (canEditAssets) {
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
        if (returnable) {
          groups.push({
            actions: [{ label: RETURN_TO_STOCK_LABEL, onSelect: () => setReturnToStockOpen(true) }],
          })
        }
        return {
          groups,
          dialogs: returnable && (
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
