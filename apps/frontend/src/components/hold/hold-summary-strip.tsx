import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { formatDate } from '@/lib/formatters'
import type { HoldDetail } from 'shared-types'

export function HoldSummaryStrip({ hold }: { hold: HoldDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="By" value={hold.created_by.name} />
      <SummaryField label="Created" value={formatDate(hold.created_at)} />
      {hold.from_dt && <SummaryField label="From" value={formatDate(hold.from_dt)} />}
      {hold.archived_at && <SummaryField label="Released" value={formatDate(hold.archived_at)} />}
      {hold.notes && <SummaryField label="Note" value={hold.notes} />}
      <AssetCompositionField assets={hold.assets} />
    </div>
  )
}
