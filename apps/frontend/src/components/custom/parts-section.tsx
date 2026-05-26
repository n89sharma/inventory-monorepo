import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { AssetDetails, PartTransfer } from "shared-types";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";
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

  const badge = transfer.donor === currentAsset
    ? <div className="flex items-center gap-0.5">
      <Badge variant="destructive">{transfer.is_exchange ? 'Exchange Donor' : 'Removed'}</Badge>
      <Button asChild variant="link" size="xs" className="p-0">
        <Link to={`/search/${transfer.recipient}`}><ArrowUpRightIcon /></Link>
      </Button>
    </div>
    : <div className="flex items-center gap-0.5">
      <Badge className="bg-lime-300 text-secondary-foreground">{transfer.is_exchange ? 'Exchange Recipient' : 'Added'}</Badge>
      <Button asChild variant="link" size="xs" className="p-0">
        <Link to={`/search/${transfer.donor}`}><ArrowUpRightIcon /></Link>
      </Button>
    </div>

  return (
    <DataRow
      key={`${transfer.donor}${transfer.part}`}
      label={transfer.part}
      rowClassName={rowClassName}>
      {badge}
    </DataRow>
  )
}