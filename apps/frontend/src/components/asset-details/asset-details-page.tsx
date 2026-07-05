import { PageContent } from '@/components/app-layout/page-content'
import { AddPartModal } from '@/components/asset-details/add-part-modal'
import { AssetEditBar } from '@/components/asset-details/asset-edit-bar'
import { AssetHistoryList } from '@/components/asset-details/asset-history'
import {
  ActivitySection,
  DataRowContainer,
  Section,
  SectionHeader,
} from '@/components/asset-details/detail-layout'
import {
  AccessoryRow,
  CMYKRow,
  DataCurrencyRow,
  DataRow,
  DataValueRow,
} from '@/components/asset-details/detail-row'
import { EditErrorsModal } from '@/components/asset-details/edit-errors-modal'
import { EditPricingModal } from '@/components/asset-details/edit-pricing-modal'
import { EditSpecsModal } from '@/components/asset-details/edit-specs-modal'
import { OptionalSection } from '@/components/asset-details/optional-section'
import { SectionEditButton } from '@/components/asset-details/section-edit-button'
import { Badge } from '@/components/shadcn/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { getBreadcrumForAssetDetails } from '@/components/shared/breadcrumb-segments'
import { Comment } from '@/components/asset-details/comment'
import { CopyButton } from '@/components/shared/copy-button'
import { ReadinessPill } from '@/components/shared/readiness/readiness-pill'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAssetDetail } from '@/hooks/use-asset-detail'
import { useAssetDetailsParams } from '@/hooks/use-asset-detail-params'
import { useAssetHistory } from '@/hooks/use-asset-history'
import { useCan } from '@/hooks/use-can'
import {
  formatDate,
  formatDateWithTime,
  formatLocation,
  formatThousandsK,
  formatTitleCase,
  formatWeight,
} from '@/lib/formatters'
import { isFromGlobalSearch } from '@/ui-types/navigation-context'
import { compareDesc } from 'date-fns'
import { Fragment, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AssetDetails, AssetHistory, AssetTransfer } from 'shared-types'
import { PartsSection } from '@/components/asset-details/parts-section'
import { AddCommentInput } from './add-comment-input'
import { StickyDetailsPageHeader } from '@/components/collections/sticky-details-page-header'

function AssetHistoryTabContent({ barcode, enabled }: { barcode: string; enabled: boolean }) {
  const { data, isLoading } = useAssetHistory(barcode, enabled)
  if (!enabled || isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  return <AssetHistoryList history={data as AssetHistory} />
}

const EMPTY_TAGS: { display: string; id: string }[] = []

const RAIL_STICKY_TOP = 'calc(var(--app-header-height) + var(--details-header-height, 0px) + 1rem)'

const ROW_GAP = 'gap-8'

function RailCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border rounded-md shadow-sm p-3">{children}</div>
}

function RailCardHeader({
  entity,
  id,
  idHref,
  date,
}: {
  entity: string
  id: string
  idHref: string
  date: Date | null
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b pb-2 mb-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">{entity}</span>
        <Link to={idHref} className="text-xs font-medium hover:underline truncate">
          {id}
        </Link>
      </div>
      {date && <span className="text-xs text-muted-foreground">{formatDate(date)}</span>}
    </div>
  )
}

function AssetSummaryStrip({
  status,
  assetType,
  serialNumber,
  location,
}: {
  status: string
  assetType: string | null
  serialNumber: string | null
  location: string
}) {
  const tokens: { key: string; node: React.ReactNode }[] = [
    { key: 'status', node: <StatusBadge status={status} /> },
  ]
  if (assetType) tokens.push({ key: 'type', node: <span>{assetType}</span> })
  if (serialNumber)
    tokens.push({
      key: 'serial',
      node: (
        <span>
          <span className="text-muted-foreground">S/N</span>{' '}
          <span className="font-mono">{serialNumber}</span>
        </span>
      ),
    })
  if (location) tokens.push({ key: 'location', node: <span>{location}</span> })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tokens.map((t) => (
        <Fragment key={t.key}>{t.node}</Fragment>
      ))}
    </div>
  )
}

function RailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs">{children}</span>
    </div>
  )
}

type LifecycleItem = { key: string; date: Date | null; node: React.ReactNode }

function buildAssetLifecycle(
  assetDetails: AssetDetails,
  transfers: AssetTransfer[],
): LifecycleItem[] {
  const { hold, arrival, departure, purchase_invoice, sales_invoice } = assetDetails
  const populated: LifecycleItem[] = []

  if (hold) {
    populated.push({
      key: 'hold',
      date: hold.created_at,
      node: (
        <>
          <RailCardHeader
            entity="Hold"
            id={hold.hold_number}
            idHref={`/holds/${hold.hold_number}`}
            date={hold.created_at}
          />
          <div className="flex flex-col gap-2">
            <RailField label="For">{hold.created_for}</RailField>
            <RailField label="By">{hold.created_by}</RailField>
          </div>
        </>
      ),
    })
  }

  if (arrival) {
    populated.push({
      key: 'arrival',
      date: arrival.created_at,
      node: (
        <>
          <RailCardHeader
            entity="Arrival"
            id={arrival.arrival_number}
            idHref={`/arrivals/${arrival.arrival_number}`}
            date={arrival.created_at}
          />
          <div className="flex flex-col gap-2">
            <RailField label="Vendor">{arrival.origin}</RailField>
            <RailField label="Warehouse">{arrival.destination_code}</RailField>
            {purchase_invoice && (
              <RailField label="Invoice">
                <Link
                  to={`/invoices/${purchase_invoice.invoice_number}`}
                  className="font-medium hover:underline"
                >
                  {purchase_invoice.invoice_number}
                </Link>
              </RailField>
            )}
          </div>
        </>
      ),
    })
  }

  if (transfers.length > 0) {
    for (const t of transfers) {
      populated.push({
        key: `transfer-${t.transfer_number}`,
        date: t.created_at,
        node: (
          <>
            <RailCardHeader
              entity="Transfer"
              id={t.transfer_number}
              idHref={`/transfers/${t.transfer_number}`}
              date={t.created_at}
            />
            <div className="text-xs flex items-center gap-1">
              <span>{t.source_code}</span>
              <span className="text-muted-foreground">→</span>
              <span>{t.destination_code}</span>
            </div>
          </>
        ),
      })
    }
  }

  if (departure) {
    populated.push({
      key: 'departure',
      date: departure.created_at,
      node: (
        <>
          <RailCardHeader
            entity="Departure"
            id={departure.departure_number}
            idHref={`/departures/${departure.departure_number}`}
            date={departure.created_at}
          />
          <div className="flex flex-col gap-2">
            <RailField label="Warehouse">{departure.origin_code}</RailField>
            <RailField label="Customer">{departure.destination}</RailField>
            {sales_invoice && (
              <RailField label="Invoice">
                <Link
                  to={`/invoices/${sales_invoice.invoice_number}`}
                  className="font-medium hover:underline"
                >
                  {sales_invoice.invoice_number}
                </Link>
              </RailField>
            )}
          </div>
        </>
      ),
    })
  }

  populated.sort((a, b) => {
    if (a.date === null && b.date === null) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return compareDesc(a.date, b.date)
  })

  return populated
}

export const AssetDetailsPage = () => {
  const { section, collectionId, assetId, searchList } = useAssetDetailsParams()
  const location = useLocation()
  const listSearch = location.search
  const breadcrumbSegments = isFromGlobalSearch(location.state)
    ? []
    : getBreadcrumForAssetDetails(section, collectionId, searchList, listSearch)

  const { data, error: detailError, isLoading: detailLoading } = useAssetDetail(assetId)
  const [editPricingOpen, setEditPricingOpen] = useState(false)
  const [editSpecsOpen, setEditSpecsOpen] = useState(false)
  const [editErrorsOpen, setEditErrorsOpen] = useState(false)
  const [editPartsOpen, setEditPartsOpen] = useState(false)
  const [historyEnabled, setHistoryEnabled] = useState(false)

  const assetDetails = data?.assetDetails ?? null
  const accessories = data?.accessories ?? []
  const errors = data?.errors ?? []
  const comments = data?.comments ?? []
  const transfers = data?.transfers ?? []
  const harvestedParts = data?.harvestedParts ?? []
  const storeParts = data?.storeParts ?? []

  const canViewSalePrice = useCan('view_sale_price')
  const canViewPurchasePrice = useCan('view_purchase_price')
  const canEditPrices = useCan('edit_prices')
  const canEditTechSpecs = useCan('edit_tech_specs')

  if (detailLoading)
    return (
      <div role="status" aria-live="polite">
        Loading…
      </div>
    )
  if (detailError) return <div>{detailError.message}</div>
  if (!assetDetails) return null

  const { cost, specs } = assetDetails
  const sortedComments = [...(comments ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const populatedLifecycleItems = buildAssetLifecycle(assetDetails, transfers)

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={breadcrumbSegments}
        titleNode={
          <h1 className="text-xl flex items-center gap-6">
            <span className="font-semibold">{`${assetDetails.brand} ${assetDetails.model}`}</span>
            <span className="group flex items-center gap-2 font-mono">
              {assetDetails.barcode}
              <CopyButton value={assetDetails.barcode} />
            </span>
          </h1>
        }
        actions={<AssetEditBar barcode={assetId} />}
        subtitle={
          <AssetSummaryStrip
            status={assetDetails.status}
            assetType={assetDetails.asset_type}
            serialNumber={assetDetails.serial_number}
            location={formatLocation(assetDetails.location)}
          />
        }
      />
      <PageContent>
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-8">
            <Section className="w-full">
              <SectionHeader
                title="Specifications"
                action={
                  canEditTechSpecs && <SectionEditButton onClick={() => setEditSpecsOpen(true)} />
                }
              />
              <div className="flex flex-row gap-x-8">
                <DataRowContainer className="flex-1 min-w-0">
                  <DataRow label="Readiness" rowClassName={ROW_GAP}>
                    <ReadinessPill status={assetDetails.readiness} />
                  </DataRow>
                  <DataValueRow
                    label="Total Meter"
                    value={formatThousandsK(specs.meter_total)}
                    rowClassName={ROW_GAP}
                  />
                  <DataValueRow
                    label="Country of Origin"
                    value={
                      assetDetails.country_of_origin
                        ? formatTitleCase(assetDetails.country_of_origin)
                        : null
                    }
                    rowClassName={ROW_GAP}
                  />
                  <DataValueRow
                    label="Manufactured Year"
                    value={assetDetails.manufactured_year}
                    rowClassName={ROW_GAP}
                  />
                  <DataValueRow
                    label="Weight"
                    value={formatWeight(assetDetails.weight)}
                    rowClassName={ROW_GAP}
                  />
                  <DataValueRow label="Size" value={assetDetails.size} rowClassName={ROW_GAP} />
                </DataRowContainer>
                <DataRowContainer className="flex-1 min-w-0">
                  <DataValueRow label="Cassettes" value={specs.cassettes} rowClassName={ROW_GAP} />
                  <DataValueRow
                    label="Internal Finisher"
                    value={specs.internal_finisher}
                    rowClassName={ROW_GAP}
                  />
                  <CMYKRow
                    label="Drum Life"
                    c_value={specs.drum_life_c}
                    m_value={specs.drum_life_m}
                    y_value={specs.drum_life_y}
                    k_value={specs.drum_life_k}
                    rowClassName={ROW_GAP}
                  />
                  <CMYKRow
                    label="Toner Remaining"
                    c_value={specs.toner_life_c}
                    m_value={specs.toner_life_m}
                    y_value={specs.toner_life_y}
                    k_value={specs.toner_life_k}
                    rowClassName={ROW_GAP}
                  />
                  <AccessoryRow
                    label="Core Functions"
                    accessories={accessories ?? []}
                    rowClassName={ROW_GAP}
                  />
                </DataRowContainer>
              </div>
            </Section>

            <div className="flex gap-8">
              <Section className="flex-1 min-w-0">
                <SectionHeader
                  title="Errors"
                  action={
                    canEditTechSpecs && (
                      <SectionEditButton onClick={() => setEditErrorsOpen(true)} />
                    )
                  }
                />
                <OptionalSection condition={!!errors?.length} fallback="No errors on record">
                  <DataRowContainer>
                    {errors?.map((e) => (
                      <DataRow
                        key={`${e.code}-${e.added_at}`}
                        label={e.code}
                        rowClassName={ROW_GAP}
                      >
                        {e.is_fixed ? (
                          <Badge variant="success">Fixed</Badge>
                        ) : (
                          <Badge variant="destructive">Open</Badge>
                        )}
                      </DataRow>
                    ))}
                  </DataRowContainer>
                </OptionalSection>
              </Section>

              <PartsSection
                asset={assetDetails}
                harvestedParts={harvestedParts}
                storeParts={storeParts}
                action={
                  canEditTechSpecs && <SectionEditButton onClick={() => setEditPartsOpen(true)} />
                }
                rowClassName={ROW_GAP}
                className="flex-1 min-w-0"
              />
            </div>

            {(canViewPurchasePrice || canViewSalePrice) && (
              <Section className="w-full print:hidden">
                <SectionHeader
                  title="Pricing"
                  action={
                    canEditPrices && <SectionEditButton onClick={() => setEditPricingOpen(true)} />
                  }
                />
                <div className="flex flex-row gap-x-8">
                  <DataRowContainer className="flex-1 min-w-0">
                    {canViewPurchasePrice && (
                      <>
                        <DataCurrencyRow
                          label="Purchase Cost"
                          value={cost.purchase_cost}
                          rowClassName={ROW_GAP}
                        />
                        <DataCurrencyRow
                          label="Total Cost"
                          value={cost.total_cost}
                          rowClassName={ROW_GAP}
                        />
                      </>
                    )}
                    {canViewSalePrice && (
                      <DataCurrencyRow
                        label="Sale Price"
                        value={cost.sale_price}
                        rowClassName={ROW_GAP}
                      />
                    )}
                  </DataRowContainer>
                  <DataRowContainer className="flex-1 min-w-0">
                    {canViewPurchasePrice && (
                      <>
                        <DataCurrencyRow
                          label="Transport Cost"
                          value={cost.transport_cost}
                          rowClassName={ROW_GAP}
                        />
                        <DataCurrencyRow
                          label="Processing Cost"
                          value={cost.processing_cost}
                          rowClassName={ROW_GAP}
                        />
                        <DataCurrencyRow
                          label="Other Cost"
                          value={cost.other_cost}
                          rowClassName={ROW_GAP}
                        />
                        <DataCurrencyRow
                          label="Parts Cost"
                          value={cost.parts_cost}
                          rowClassName={ROW_GAP}
                        />
                      </>
                    )}
                  </DataRowContainer>
                </div>
              </Section>
            )}

            <ActivitySection className="min-w-0">
              <Tabs
                defaultValue="comments"
                onValueChange={(value) => {
                  if (value === 'history') setHistoryEnabled(true)
                }}
              >
                <TabsList variant="line">
                  <TabsTrigger value="comments">
                    <SectionHeader title="Comments" className="px-2 mb-0" />
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <SectionHeader title="History" className="px-2 mb-0" />
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="space-y-3 py-3 min-h-96">
                  <AddCommentInput barcode={assetDetails.barcode} />
                  {sortedComments.map((c) => (
                    <Comment
                      key={`${c.username}-${c.created_at}`}
                      user={c.username}
                      date={formatDateWithTime(c.created_at)}
                      avatarFallback={c.initials}
                      comment={c.comment}
                      tags={EMPTY_TAGS}
                    />
                  ))}
                </TabsContent>
                <TabsContent
                  value="history"
                  className="py-3 overflow-x-hidden break-words min-h-96"
                >
                  <AssetHistoryTabContent barcode={assetDetails.barcode} enabled={historyEnabled} />
                </TabsContent>
              </Tabs>
            </ActivitySection>
          </div>

          {populatedLifecycleItems.length > 0 && (
            <aside
              className="w-48 shrink-0 self-start sticky flex flex-col gap-3"
              style={{ top: RAIL_STICKY_TOP }}
              aria-label="Lifecycle"
            >
              {populatedLifecycleItems.map((item) => (
                <RailCard key={item.key}>{item.node}</RailCard>
              ))}
            </aside>
          )}
        </div>
      </PageContent>

      <EditPricingModal
        open={editPricingOpen}
        onOpenChange={setEditPricingOpen}
        assetDetails={assetDetails}
      />
      <EditSpecsModal
        open={editSpecsOpen}
        onOpenChange={setEditSpecsOpen}
        assetDetails={assetDetails}
        accessories={accessories}
        errors={errors}
      />
      <EditErrorsModal
        open={editErrorsOpen}
        onOpenChange={setEditErrorsOpen}
        assetDetails={assetDetails}
        errors={errors}
      />
      <AddPartModal
        open={editPartsOpen}
        onOpenChange={setEditPartsOpen}
        recipientBarcode={assetDetails.barcode}
      />
    </>
  )
}
