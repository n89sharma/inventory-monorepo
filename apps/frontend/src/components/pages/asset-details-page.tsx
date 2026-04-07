import { AccessoryRow, AssetTitle, CMYKRow, DataCurrencyRow, DataDateRow, DataLinkRow, DataRowContainer, DataValueRow, DetailsContainer, ErrorHeader, ErrorRow, InvoiceClearedRow, PartsHeader, Section, SectionHeader, SectionRow } from '@/components/custom/asset-detail'
import { Comment } from '@/components/custom/comment'
import { getBreadcrumForAssetDetails, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { Button } from '@/components/shadcn/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import { useAssetStore } from "@/data/store/asset-store"
import { useNavigationStore } from '@/data/store/navigation-store'
import { useAssetDetailsParams } from '@/hooks/use-asset-detail-params'
import { formatDateWithTime, formatThousandsK } from '@/lib/formatters'
import type { NavigationSection } from '@/ui-types/navigation-context'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const EMPTY_TAGS: { display: string; id: string }[] = []

export const AssetDetailsPage = () => {

  const { section, collectionId, assetId } = useAssetDetailsParams()

  const { pathname } = useLocation()
  const [currentIndex, setCurrentTransferIndex] = useState(0)

  const setLastPath = useNavigationStore(state => state.setLastPath)

  const ad = useAssetStore((state) => state.assetDetails)
  const aa = useAssetStore((state) => state.accessories)
  const ae = useAssetStore((state) => state.errors)
  const ac = useAssetStore((state) => state.comments)
  const at = useAssetStore((state) => state.transfers)
  const ap = useAssetStore((state) => state.parts)

  const loading = useAssetStore((state) => state.loading)
  const error = useAssetStore((state) => state.error)
  const getAssetDetails = useAssetStore((state) => state.getAssetDetails)

  useEffect(() => {
    if (section) setLastPath(section as NavigationSection, pathname)
    if (!assetId) return
    setCurrentTransferIndex(0)
    getAssetDetails(assetId)
  }, [assetId])

  function handleNextTransfer() {
    if (at.length === 0) return
    setCurrentTransferIndex((prev) => (prev + 1) % at.length)
  }

  function handlePreviousTransfer() {
    if (at.length === 0) return
    setCurrentTransferIndex((prev) => (prev - 1 + at.length) % at.length)
  }

  const currTransfer = at[currentIndex] || null

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="flex flex-col gap-2">
      <PageBreadcrumb segments={getBreadcrumForAssetDetails(section, collectionId, assetId)} />
      {!!ad && <DetailsContainer>

        <SectionRow className="flex-col">
          <Section>
            <AssetTitle brand={ad?.brand} model={ad?.model} barcode={ad?.barcode}></AssetTitle>
          </Section>
        </SectionRow>


        <SectionRow>

          <Section>
            <SectionHeader title="Summary"></SectionHeader>
            <DataRowContainer>
              <DataValueRow label="Asset Type" value={ad?.asset_type} />
              <DataValueRow label="Serial #" value={ad?.serial_number} />
              <DataValueRow label="Meter" value={ad ? formatThousandsK(ad.specs.meter_total) : '0K'} />
              <DataValueRow label="Tracking Status" value={ad?.tracking_status} />
              <DataValueRow label="Availability" value={ad?.availability_status} />
              <DataValueRow label="Technical Status" value={ad?.technical_status} />
              <DataValueRow label="Warehouse" value={ad?.warehouse_code} />
              <DataValueRow label="Location" value={ad?.location} />
              <DataDateRow label="Created At" value={ad?.created_at} />
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Pricing"></SectionHeader>
            <DataRowContainer>
              <DataCurrencyRow label="Purchase Cost" value={ad?.cost.purchase_cost} />
              <DataCurrencyRow label="Transport Cost" value={ad?.cost.transport_cost} />
              <DataCurrencyRow label="Processing Cost" value={ad?.cost.processing_cost} />
              <DataCurrencyRow label="Other Cost" value={ad?.cost.other_cost} />
              <DataCurrencyRow label="Parts Cost" value={ad?.cost.parts_cost} />
              <DataCurrencyRow label="Total Cost" value={ad?.cost.total_cost} />
              <DataCurrencyRow label="Sale Price" value={ad?.cost.sale_price} />
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Hold"></SectionHeader>
            <DataRowContainer>
              <DataDateRow label="Date" value={ad?.hold?.created_at} />
              <DataValueRow label="Customer" value={ad?.hold.customer} />
              <DataValueRow label="For" value={ad?.hold.created_for} />
              <DataValueRow label="By" value={ad?.hold.created_by} />
              <DataValueRow label="Notes" value={ad?.hold.notes} />
              <DataLinkRow label="Hold #" value={ad?.hold.hold_number} to={`/holds/${ad?.hold.hold_number}`} />
            </DataRowContainer>
          </Section>

        </SectionRow>

        <SectionRow>

          <Section>
            <SectionHeader title="Specifications"></SectionHeader>
            <DataRowContainer>
              <DataValueRow label="Cassettes" value={ad?.specs.cassettes} />
              <DataValueRow label="Internal Finisher" value={ad?.specs.internal_finisher} />
              <CMYKRow label="Drum Life" c_value={ad?.specs.drum_life_c} m_value={ad?.specs.drum_life_m} y_value={ad?.specs.drum_life_y} k_value={ad?.specs.drum_life_k} />
              <AccessoryRow label="Core Functions" accessories={aa ?? []}></AccessoryRow>
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Errors"></SectionHeader>
            <ErrorHeader />
            <DataRowContainer>
              {ae?.map(e => <ErrorRow key={`${e.code}-${e.added_at}`} error={e} />)}
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Installed Parts" />
            <PartsHeader />
            {ap?.map(p => <DataValueRow key={p.store_part_number} label={p.partName} value={p.donor} />)}
          </Section>

        </SectionRow>

        <SectionRow>

          <Section>
            <SectionHeader title="Arrival"></SectionHeader>
            <DataRowContainer>
              <DataDateRow label="Arrived On" value={ad?.arrival.created_at} />
              <DataValueRow label="Vendor" value={ad?.arrival.origin} />
              <DataValueRow label="Warehouse" value={ad?.arrival.destination_code} />
              <DataLinkRow label="Arrival #" value={ad?.arrival.arrival_number} to={`/arrivals/${ad?.arrival.arrival_number}`} />
              <DataValueRow label="Transporter" value={ad?.arrival.transporter} />
              <DataLinkRow label="Invoice #" value={ad?.purchase_invoice.invoice_number} to={`/invoices/${ad?.purchase_invoice.invoice_number}`} />
              <InvoiceClearedRow isCleared={!!ad?.purchase_invoice.is_cleared} />
            </DataRowContainer>
          </Section>

          <Section>
            <div className="flex items-center">
              <SectionHeader title="Transfer" />
              <div className={`flex items-center justify-between w-full ml-10 ${!at.length && "hidden"}`}>
                <span className="text-sm font-medium text-muted-foreground">{`${currentIndex + 1}/${at.length}`}</span>
                <div>
                  <Button variant="outline" size="xs" onClick={handlePreviousTransfer} aria-label="Previous transfer">
                    <CaretLeftIcon weight="fill" aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="xs" onClick={handleNextTransfer} aria-label="Next transfer">
                    <CaretRightIcon weight="fill" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
            <DataRowContainer>
              <DataDateRow label="Transferred On" value={currTransfer?.created_at} />
              <DataValueRow label="Source" value={currTransfer?.source_code} />
              <DataValueRow label="Destination" value={currTransfer?.destination_code} />
              <DataLinkRow label="Transfer #" value={currTransfer?.transfer_number} to={`/transfers/${currTransfer?.transfer_number}`} />
              <DataValueRow label="Transporter" value={currTransfer?.transporter} />
            </DataRowContainer>
          </Section>

          <Section>
            <SectionHeader title="Departure"></SectionHeader>
            <DataRowContainer>
              <DataDateRow label="Departed On" value={ad?.departure?.created_at} />
              <DataValueRow label="Warehouse" value={ad?.departure?.origin_code} />
              <DataValueRow label="Customer" value={ad?.departure?.destination} />
              <DataLinkRow label="Departure #" value={ad?.departure?.departure_number} to={`/departures/${ad?.departure?.departure_number}`} />
              <DataValueRow label="Transporter" value={ad?.departure?.transporter} />
            </DataRowContainer>
          </Section>

        </SectionRow>

        <Tabs defaultValue="comments">
          <TabsList variant="line">
            <TabsTrigger value="comments"><SectionHeader title="Comments" /></TabsTrigger>
            <TabsTrigger value="history"><SectionHeader title="History" /></TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="flex flex-col gap-3">
            {ac?.map(c => (<Comment
              key={`${c.username}-${c.created_at}`}
              user={c.username}
              date={formatDateWithTime(c.created_at)}
              avatarFallback={c.initials}
              comment={c.comment}
              tags={EMPTY_TAGS}
            />))}
          </TabsContent>
        </Tabs>

      </DetailsContainer>}
    </div>
  )
}
