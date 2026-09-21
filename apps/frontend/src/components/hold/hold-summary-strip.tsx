import { CostSummaryStrip } from '@/components/shared/cards/cost-summary-strip'
import type { HoldDetail } from 'shared-types'

export function HoldSummaryStrip({ hold }: { hold: HoldDetail }) {
  return <CostSummaryStrip assets={hold.assets} />
}
