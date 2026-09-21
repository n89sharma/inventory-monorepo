import { SummaryStrip } from '@/components/shared/cards/summary-strip'
import type { HoldDetail } from 'shared-types'

export function HoldSummaryStrip({ hold }: { hold: HoldDetail }) {
  return <SummaryStrip assets={hold.assets} />
}
