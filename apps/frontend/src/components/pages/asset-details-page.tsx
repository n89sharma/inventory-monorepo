import { ActivitySection, AssetTitle, DataRowContainer, DetailsContainer, Section, SectionHeader, SectionRow } from '@/components/custom/asset-details/detail-layout'
import { AccessoryRow, CMYKRow, DataCurrencyRow, DataDateRow, DataLinkRow, DataRow, DataValue, DataValueRow, ErrorHeader, ErrorRow, InvoiceClearedRow } from '@/components/custom/asset-details/detail-row'
import { OptionalSection } from '@/components/custom/asset-details/optional-section'
import { TransferSection } from '@/components/custom/asset-details/transfer-section'
import { AssetEditBar } from '@/components/custom/asset-edit-bar'
import { AssetHistoryList } from '@/components/custom/asset-history'
import { Comment } from '@/components/custom/comment'
import { CopyButton } from '@/components/custom/copy-button'
import { getBreadcrumForAssetDetails } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { EditLocationModal } from '@/components/modals/edit-location-modal'
import { Button } from '@/components/shadcn/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import { useAssetDetail } from '@/hooks/use-asset-detail'
import { useAssetDetailsParams } from '@/hooks/use-asset-detail-params'
import { useAssetHistory } from '@/hooks/use-asset-history'
import { useCan } from '@/hooks/use-can'
import { formatDateWithTime, formatThousandsK } from '@/lib/formatters'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { AssetHistory } from 'shared-types'
import { AddCommentInput } from '../custom/add-comment-input'
import { PartsSection } from '../custom/parts-section'

function AssetHistoryTabContent(
  { barcode, enabled }: { barcode: string; enabled: boolean }
) {
  const { data, isLoading } = useAssetHistory(barcode, enabled)
  if (!enabled || isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  return <AssetHistoryList history={data as AssetHistory} />
}

const EMPTY_TAGS: { display: string; id: string }[] = []

export const AssetDetailsPage = () => {

  const { section, collectionId, assetId } = useAssetDetailsParams()
  const { data, error: detailError, isLoading: detailLoading } = useAssetDetail(assetId)
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [historyEnabled, setHistoryEnabled] = useState(false)

  const assetDetails = data?.assetDetails ?? null
  const accessories = data?.accessories ?? []
  const errors = data?.errors ?? []
  const comments = data?.comments ?? []
  const transfers = data?.transfers ?? []
  const partTransfers = data?.partTransfers ?? []

  const canViewSalePrice = useCan('view_sale_price')
  const canViewPurchasePrice = useCan('view_purchase_price')

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!assetDetails) return null

  const { cost, hold, arrival, departure, specs, purchase_invoice } = assetDetails
  const sortedComments = [...(comments ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumForAssetDetails(section, collectionId, assetId)}
        titleNode={
          <AssetTitle
            brand={assetDetails.brand}
            model={assetDetails.model}
            barcode={assetDetails.barcode}
          />
        }
        actions={<AssetEditBar barcode={assetId} />}
      />
      <PageContent className="flex flex-col gap-2">
      <DetailsContainer>
        <SectionRow>
          <Section>
            <SectionHeader title="Summary"></SectionHeader>
            <DataRowContainer>
              <DataValueRow label="Asset Type" value={assetDetails.asset_type} />
              <DataRow label="Serial #">
                <div className="group flex items-center gap-2">
                  <DataValue value={assetDetails.serial_number} />
                  <CopyButton value={assetDetails.serial_number} />
                </div>
              </DataRow>
              <DataValueRow label="Meter" value={formatThousandsK(specs.meter_total)} />
              <DataValueRow label="Availability" value={assetDetails.availability_status} />
              <DataValueRow label="Technical Status" value={assetDetails.technical_status} />
              <DataValueRow label="Warehouse" value={assetDetails.warehouse_code} />
              <DataRow label="Location">
                <div className="group flex items-center gap-2">
                  <DataValue value={assetDetails.location} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    aria-label="Edit location"
                    onClick={() => setEditLocationOpen(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilSimpleIcon aria-hidden="true" />
                  </Button>
                </div>
              </DataRow>
              <DataDateRow label="Created At" value={assetDetails.created_at} />
            </DataRowContainer>
          </Section>

          {(canViewPurchasePrice || canViewSalePrice) &&
            <Section>
              <SectionHeader title="Pricing"></SectionHeader>
              <DataRowContainer>
                {
                  canViewPurchasePrice &&
                  <>
                    <DataCurrencyRow label="Purchase Cost" value={cost.purchase_cost} />
                    <DataCurrencyRow label="Transport Cost" value={cost.transport_cost} />
                    <DataCurrencyRow label="Processing Cost" value={cost.processing_cost} />
                    <DataCurrencyRow label="Other Cost" value={cost.other_cost} />
                    <DataCurrencyRow label="Parts Cost" value={cost.parts_cost} />
                    <DataCurrencyRow label="Total Cost" value={cost.total_cost} />
                  </>
                }
                {canViewSalePrice && <DataCurrencyRow label="Sale Price" value={cost.sale_price} />}
              </DataRowContainer>
            </Section>
          }
          <Section>
            <SectionHeader title="Hold"></SectionHeader>
            <OptionalSection condition={!!hold} fallback="No hold on record">
              <DataRowContainer>
                <DataLinkRow label="Hold #" value={hold?.hold_number} to={`/holds/${hold?.hold_number}`} />
                <DataDateRow label="Date" value={hold?.created_at} />
                <DataValueRow label="Customer" value={hold?.customer} />
                <DataValueRow label="For" value={hold?.created_for} />
                <DataValueRow label="By" value={hold?.created_by} />
                <DataValueRow label="Notes" value={hold?.notes} />
              </DataRowContainer>
            </OptionalSection>
          </Section>

        </SectionRow>

        <SectionRow>

          <Section>
            <SectionHeader title="Specifications"></SectionHeader>
            <DataRowContainer>
              <DataValueRow label="Cassettes" value={specs.cassettes} />
              <DataValueRow label="Internal Finisher" value={specs.internal_finisher} />
              <CMYKRow
                label="Drum Life"
                c_value={specs.drum_life_c}
                m_value={specs.drum_life_m}
                y_value={specs.drum_life_y}
                k_value={specs.drum_life_k}
              />
              <AccessoryRow label="Core Functions" accessories={accessories ?? []}></AccessoryRow>
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Errors"></SectionHeader>
            <OptionalSection condition={!!errors?.length} fallback="No errors on record">
              <ErrorHeader />
              <DataRowContainer>
                {errors?.map(e => <ErrorRow key={`${e.code}-${e.added_at}`} error={e} />)}
              </DataRowContainer>
            </OptionalSection>
          </Section>

          <PartsSection asset={assetDetails} partTransfers={partTransfers} />

        </SectionRow>

        <SectionRow>

          <Section>
            <SectionHeader title="Arrival"></SectionHeader>
            <OptionalSection condition={!!arrival} fallback="No arrival on record">
              <DataRowContainer>
                <DataLinkRow label="Arrival #" value={arrival?.arrival_number} to={`/arrivals/${arrival?.arrival_number}`} />
                <DataDateRow label="Arrived On" value={arrival?.created_at} />
                <DataValueRow label="Vendor" value={arrival?.origin} />
                <DataValueRow label="Warehouse" value={arrival?.destination_code} />
                <DataValueRow label="Transporter" value={arrival?.transporter} />
                {purchase_invoice
                  ? <DataLinkRow label="Invoice #" value={purchase_invoice.invoice_number} to={`/invoices/${purchase_invoice.invoice_number}`} />
                  : <DataValueRow label="Invoice #" value="-" />
                }
                <InvoiceClearedRow isCleared={!!purchase_invoice?.is_cleared} />
              </DataRowContainer>
            </OptionalSection>
          </Section>

          <TransferSection transfers={transfers} />

          <Section>
            <SectionHeader title="Departure"></SectionHeader>
            <OptionalSection condition={!!departure} fallback="No departure on record">
              <DataRowContainer>
                <DataLinkRow label="Departure #" value={departure?.departure_number} to={`/departures/${departure?.departure_number}`} />
                <DataDateRow label="Departed On" value={departure?.created_at} />
                <DataValueRow label="Warehouse" value={departure?.origin_code} />
                <DataValueRow label="Customer" value={departure?.destination} />
                <DataValueRow label="Transporter" value={departure?.transporter} />
              </DataRowContainer>
            </OptionalSection>
          </Section>

        </SectionRow>

        <ActivitySection>
          <Tabs
            defaultValue="comments"
            onValueChange={(value) => { if (value === 'history') setHistoryEnabled(true) }}
          >
            <TabsList variant="line">
              <TabsTrigger value="comments"><SectionHeader title="Comments" className="px-2 mb-0" /></TabsTrigger>
              <TabsTrigger value="history"><SectionHeader title="History" className="px-2 mb-0" /></TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="flex flex-col gap-3 py-3 overflow-y-auto max-h-105 pr-1">
              <AddCommentInput barcode={assetDetails.barcode} />
              {
                sortedComments.map(c => (<Comment
                  key={`${c.username}-${c.created_at}`}
                  user={c.username}
                  date={formatDateWithTime(c.created_at)}
                  avatarFallback={c.initials}
                  comment={c.comment}
                  tags={EMPTY_TAGS}
                />))
              }
            </TabsContent>
            <TabsContent value="history" className="py-3 overflow-y-auto max-h-105 pr-1">
              <AssetHistoryTabContent barcode={assetDetails.barcode} enabled={historyEnabled} />
            </TabsContent>
          </Tabs>
        </ActivitySection>

      </DetailsContainer>

      <EditLocationModal
        open={editLocationOpen}
        onOpenChange={setEditLocationOpen}
        assetDetails={assetDetails}
      />
      </PageContent>
    </>
  )
}
