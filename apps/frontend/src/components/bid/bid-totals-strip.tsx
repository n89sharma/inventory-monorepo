import { SummaryField } from '@/components/shared/cards/summary-field'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { BidTotals } from 'shared-types'

export function BidTotalsStrip({ totals }: { totals: BidTotals }): React.JSX.Element {
  return (
    <div className="flex w-fit flex-wrap items-baseline gap-x-6 gap-y-1">
      <SummaryField label="Total Cost" value={formatUSDWithSymbol(totals.total_cost)} />
      <SummaryField label="Expected Sale" value={formatUSDWithSymbol(totals.expected_sale)} />
      <SummaryField label="Expected Margin" value={formatUSDWithSymbol(totals.expected_margin)} />
      <SummaryField label="Unpriced Rows" value={String(totals.unpriced_count)} />
    </div>
  )
}
