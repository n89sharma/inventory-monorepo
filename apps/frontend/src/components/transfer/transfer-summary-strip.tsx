import { SummaryStrip } from '@/components/shared/cards/summary-strip'
import type { TransferDetail } from 'shared-types'

export function TransferSummaryStrip({ transfer }: { transfer: TransferDetail }) {
  return <SummaryStrip assets={transfer.assets} />
}
