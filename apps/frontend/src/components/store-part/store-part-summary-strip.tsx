import { SummaryField } from '@/components/shared/cards/summary-field'
import { useCan } from '@/hooks/use-can'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { StorePartSummary } from 'shared-types'

export function StorePartSummaryStrip({ rows }: { rows: StorePartSummary[] }): React.ReactNode {
  const canViewStore = useCan('view_store')
  const canViewPurchasePrice = useCan('view_purchase_price')
  if (!canViewStore || !canViewPurchasePrice) return null

  const stockValue = rows.reduce((total, row) => total + (row.stock_value ?? 0), 0)
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Stock Value" value={formatUSDWithSymbol(stockValue)} />
    </div>
  )
}
