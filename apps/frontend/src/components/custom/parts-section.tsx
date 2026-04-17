import { Link } from "react-router-dom";
import type { AssetDetails, PartTransfer } from "shared-types";
import { Badge } from "../shadcn/badge";
import { Section, SectionHeader } from "./asset-details/detail-layout";
import { DataRow } from "./asset-details/detail-row";
import { OptionalSection } from "./asset-details/optional-section";

type PartSectionProps = {
  asset: AssetDetails
  partTransfers: PartTransfer[]
}
export function PartsSection({ asset, partTransfers }: PartSectionProps): React.JSX.Element {

  return (
    <Section>
      <SectionHeader title="Parts Transferred" />
      <OptionalSection condition={!!partTransfers?.length} fallback="No parts installed">
        {
          partTransfers?.map(p => getPartBadge(p, asset.barcode))
        }
      </OptionalSection>
    </Section>
  )
}

function getPartBadge(transfer: PartTransfer, currentAsset: string) {

  const badge = transfer.donor === currentAsset
    ? <Badge variant="destructive">
      <Link to={`/search/${transfer.recipient}`}>{transfer.is_exchange ? 'Exchange Donor' : 'Removed'}</Link>
    </Badge>
    : <Badge className="bg-lime-300 text-secondary-foreground">
      <Link to={`/search/${transfer.donor}`}>{transfer.is_exchange ? 'Exchange Recipient' : 'Added'}</Link>
    </Badge>

  return (
    <DataRow
      key={`${transfer.donor}${transfer.part}`}
      label={transfer.part}>
      {badge}
    </DataRow>
  )
}