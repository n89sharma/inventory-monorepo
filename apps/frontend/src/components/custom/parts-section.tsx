import { Link } from "react-router-dom";
import type { AssetDetails, PartTransfer } from "shared-types";
import { Badge } from "../shadcn/badge";
import { Section, SectionHeader } from "./asset-details/detail-layout";
import { DataRow } from "./asset-details/detail-row";
import { OptionalSection } from "./asset-details/optional-section";

type PartSectionProps = {
  asset: AssetDetails
  partTransfers: PartTransfer[]
  action?: React.ReactNode
  rowClassName?: string
  className?: string
}
export function PartsSection(
  { asset, partTransfers, action, rowClassName, className }: PartSectionProps,
): React.JSX.Element {

  return (
    <Section className={className}>
      <SectionHeader title="Parts Transferred" action={action} />
      <OptionalSection condition={!!partTransfers?.length} fallback="No parts installed">
        {
          partTransfers?.map(p => getPartBadge(p, asset.barcode, rowClassName))
        }
      </OptionalSection>
    </Section>
  )
}

function getPartBadge(transfer: PartTransfer, currentAsset: string, rowClassName?: string) {
  const isDonor = transfer.donor === currentAsset
  const counterpartBarcode = isDonor ? transfer.recipient : transfer.donor

  const badge = isDonor
    ? <Badge variant="destructive">{transfer.is_exchange ? 'Removed (exchange)' : 'Removed'}</Badge>
    : <Badge variant="success">{transfer.is_exchange ? 'Added (exchange)' : 'Added'}</Badge>

  return (
    <DataRow
      key={`${transfer.donor}${transfer.part}`}
      label={transfer.part}
      rowClassName={rowClassName}>
      <div className="flex items-center gap-2">
        {badge}
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
