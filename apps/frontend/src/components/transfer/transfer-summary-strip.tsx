import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { SummaryStrip } from '@/components/shared/cards/summary-strip'
import type { TransferDetail } from 'shared-types'

export function TransferSummaryStrip({ transfer }: { transfer: TransferDetail }) {
  return (
    <SummaryStrip assets={transfer.assets}>
      <SummaryField label="Transporter" value={transfer.transporter.name} />
      {transfer.created_by && <SummaryField label="By" value={transfer.created_by} />}
      {transfer.notes && <SummaryField label="Note" value={transfer.notes} />}
      <AssetCompositionField assets={transfer.assets} />
      <AssetTotalsField assets={transfer.assets} />
    </SummaryStrip>
  )
}
