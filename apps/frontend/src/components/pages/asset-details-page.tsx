import { AccessoryRow, AssetTitle, CMYKRow, DataCurrencyRow, DataDateRow, DataLinkRow, DataRow, DataRowContainer, DataValue, DataValueRow, DetailsContainer, ErrorHeader, ErrorRow, InvoiceClearedRow, PartsHeader, Section, SectionHeader, SectionRow } from '@/components/custom/asset-details/asset-detail'
import { OptionalSection } from '@/components/custom/asset-details/optional-section'
import { TransferSection } from '@/components/custom/asset-details/transfer-section'
import { Comment } from '@/components/custom/comment'
import { CopyButton } from '@/components/custom/copy-button'
import { getBreadcrumForAssetDetails, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import { useAssetStore } from "@/data/store/asset-store"
import { useNavigationStore } from '@/data/store/navigation-store'
import { useAssetDetailsParams } from '@/hooks/use-asset-detail-params'
import { formatDateWithTime, formatThousandsK } from '@/lib/formatters'
import type { NavigationSection } from '@/ui-types/navigation-context'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const EMPTY_TAGS: { display: string; id: string }[] = []

export const AssetDetailsPage = () => {

  const { section, collectionId, assetId } = useAssetDetailsParams()
  const { pathname } = useLocation()
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const assetDetails = useAssetStore((state) => state.assetDetails)
  const accessories = useAssetStore((state) => state.accessories)
  const errors = useAssetStore((state) => state.errors)
  const comments = useAssetStore((state) => state.comments)
  const at = useAssetStore((state) => state.transfers)
  const ap = useAssetStore((state) => state.parts)

  const loading = useAssetStore((state) => state.loading)
  const error = useAssetStore((state) => state.error)
  const getAssetDetails = useAssetStore((state) => state.getAssetDetails)

  useEffect(() => {
    if (section) setLastPath(section as NavigationSection, pathname)
    if (!assetId) return
    getAssetDetails(assetId)
  }, [assetId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!assetDetails) return null

  const { cost, hold, arrival, departure, specs, purchase_invoice } = assetDetails

  return (
    <div className="flex flex-col gap-2">
      <PageBreadcrumb segments={getBreadcrumForAssetDetails(section, collectionId, assetId)} />
      <DetailsContainer>
        <AssetTitle brand={assetDetails.brand} model={assetDetails.model} barcode={assetDetails.barcode}></AssetTitle>

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
              <DataValueRow label="Tracking Status" value={assetDetails.tracking_status} />
              <DataValueRow label="Availability" value={assetDetails.availability_status} />
              <DataValueRow label="Technical Status" value={assetDetails.technical_status} />
              <DataValueRow label="Warehouse" value={assetDetails.warehouse_code} />
              <DataValueRow label="Location" value={assetDetails.location} />
              <DataDateRow label="Created At" value={assetDetails.created_at} />
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Pricing"></SectionHeader>
            <DataRowContainer>
              <DataCurrencyRow label="Purchase Cost" value={cost.purchase_cost} />
              <DataCurrencyRow label="Transport Cost" value={cost.transport_cost} />
              <DataCurrencyRow label="Processing Cost" value={cost.processing_cost} />
              <DataCurrencyRow label="Other Cost" value={cost.other_cost} />
              <DataCurrencyRow label="Parts Cost" value={cost.parts_cost} />
              <DataCurrencyRow label="Total Cost" value={cost.total_cost} />
              <DataCurrencyRow label="Sale Price" value={cost.sale_price} />
            </DataRowContainer>
          </Section>

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

          <Section>
            <SectionHeader title="Installed Parts" />
            <OptionalSection condition={!!ap?.length} fallback="No parts installed">
              <PartsHeader />
              {ap?.map(p => <DataValueRow key={p.store_part_number} label={p.partName} value={p.donor} />)}
            </OptionalSection>
          </Section>

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

          <TransferSection transfers={at} />

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

        <Tabs defaultValue="comments">
          <TabsList variant="line">
            <TabsTrigger value="comments"><SectionHeader title="Comments" className="px-2" /></TabsTrigger>
            <TabsTrigger value="history"><SectionHeader title="History" className="px-2" /></TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="flex flex-col gap-3">
            {comments?.map(c => (<Comment
              key={`${c.username}-${c.created_at}`}
              user={c.username}
              date={formatDateWithTime(c.created_at)}
              avatarFallback={c.initials}
              comment={c.comment}
              tags={EMPTY_TAGS}
            />))}
          </TabsContent>
        </Tabs>

      </DetailsContainer>
    </div>
  )
}
