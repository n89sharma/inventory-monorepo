import { CostSummaryStrip } from '@/components/shared/cards/cost-summary-strip'
import type { TransferDetail } from 'shared-types'

export function TransferSummaryStrip({ transfer }: { transfer: TransferDetail }) {
  return <CostSummaryStrip assets={transfer.assets} />
}
