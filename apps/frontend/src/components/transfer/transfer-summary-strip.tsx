import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import type { TransferDetail } from 'shared-types'

export function TransferSummaryStrip({ transfer }: { transfer: TransferDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Transporter" value={transfer.transporter.name} />
      {transfer.created_by && <SummaryField label="By" value={transfer.created_by} />}
      {transfer.notes && <SummaryField label="Note" value={transfer.notes} />}
      <AssetCompositionField assets={transfer.assets} />
      <AssetTotalsField assets={transfer.assets} />
    </div>
  )
}
