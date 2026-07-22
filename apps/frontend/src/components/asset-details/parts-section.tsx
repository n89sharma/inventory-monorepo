import { Link } from 'react-router-dom'
import type { AssetDetails, AssetHarvestedPart, AssetStorePartRow } from 'shared-types'
import { Section, SectionHeader } from '../asset-details/detail-layout'
import { DataRow } from '../asset-details/detail-row'
import { OptionalSection } from '../asset-details/optional-section'
import { Badge } from '../shadcn/badge'

type PartSectionProps = {
  asset: AssetDetails
  harvestedParts: AssetHarvestedPart[]
  storeParts: AssetStorePartRow[]
  action?: React.ReactNode
  rowClassName?: string
  className?: string
}
export function PartsSection({
  asset,
  harvestedParts,
  storeParts,
  action,
  rowClassName,
  className,
}: PartSectionProps): React.JSX.Element {
  const hasParts = !!harvestedParts?.length || !!storeParts?.length

  return (
    <Section className={className}>
      <SectionHeader title="Parts" action={action} />
      <OptionalSection condition={hasParts} fallback="No parts installed">
        {harvestedParts?.map((p) => getHarvestedPartBadge(p, asset.barcode, rowClassName))}
        {storeParts?.map((sp) => getStorePartBadge(sp, rowClassName))}
      </OptionalSection>
    </Section>
  )
}

function HarvestedPartBadge({ isDonor, isExchange }: { isDonor: boolean; isExchange: boolean }) {
  if (isDonor) {
    return <Badge variant="destructive">{isExchange ? 'Removed (exchange)' : 'Removed'}</Badge>
  }
  return <Badge variant="success">{isExchange ? 'Added (exchange)' : 'Added'}</Badge>
}

function getHarvestedPartBadge(
  transfer: AssetHarvestedPart,
  currentAsset: string,
  rowClassName?: string,
) {
  const isDonor = transfer.donor === currentAsset
  const counterpartBarcode = isDonor ? transfer.recipient : transfer.donor

  return (
    <DataRow
      key={`${transfer.donor}${transfer.part}`}
      label={transfer.part}
      rowClassName={rowClassName}
    >
      <div className="flex items-center gap-2">
        <HarvestedPartBadge isDonor={isDonor} isExchange={transfer.is_exchange} />
        <Link
          to={`/search/all/${counterpartBarcode}`}
          className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
        >
          {counterpartBarcode}
        </Link>
      </div>
    </DataRow>
  )
}

function getStorePartBadge(storePart: AssetStorePartRow, rowClassName?: string) {
  return (
    <DataRow
      key={`store-${storePart.store_part_id}-${storePart.part_number}`}
      label={`${storePart.part_number} x${storePart.quantity}`}
      rowClassName={rowClassName}
    >
      <div className="flex items-center gap-2">
        <Badge variant="success">Added</Badge>
        <Link
          to={`/store/${storePart.part_number}`}
          className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
        >
          Store
        </Link>
      </div>
    </DataRow>
  )
}
