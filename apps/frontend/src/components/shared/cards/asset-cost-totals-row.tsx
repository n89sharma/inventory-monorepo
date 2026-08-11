import { SummaryField } from '@/components/shared/cards/summary-field'
import { useCan } from '@/hooks/use-can'
import { formatMarginPercent, formatUSDWithSymbol } from '@/lib/formatters'
import type { AssetSearchRow } from 'shared-types'

type CostTotalFieldId =
  | 'cost_purchase_cost'
  | 'cost_transport_cost'
  | 'cost_processing_cost'
  | 'cost_total_cost'
  | 'cost_sale_price'

const COST_TOTAL_FIELDS = [
  { id: 'cost_purchase_cost', label: 'Purchase Cost' },
  { id: 'cost_transport_cost', label: 'Transport Cost' },
  { id: 'cost_processing_cost', label: 'Processing Cost' },
  { id: 'cost_total_cost', label: 'Total Cost' },
  { id: 'cost_sale_price', label: 'Sale Price' },
] as const satisfies readonly { id: CostTotalFieldId; label: string }[]

function sumCost(assets: AssetSearchRow[], field: CostTotalFieldId): number {
  return assets.reduce((total, asset) => total + (asset[field] ?? 0), 0)
}

export function AssetCostTotalsRow({ assets }: { assets: AssetSearchRow[] }) {
  const can = useCan()
  const canViewProfitability = can('view_purchase_price') && can('view_sale_price')
  if (!canViewProfitability) return null

  // Margin is derived from the same two totals this row prints, rather than from the
  // priced-assets-only rule the departed report uses, so the line reconciles on screen.
  const salePrice = sumCost(assets, 'cost_sale_price')
  const totalCost = sumCost(assets, 'cost_total_cost')
  const grossMargin = salePrice - totalCost
  const marginPercent = salePrice === 0 ? 0 : (grossMargin / salePrice) * 100

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      {COST_TOTAL_FIELDS.map((field) => (
        <SummaryField
          key={field.id}
          label={field.label}
          value={formatUSDWithSymbol(sumCost(assets, field.id))}
        />
      ))}
      <SummaryField label="Gross Margin" value={formatUSDWithSymbol(grossMargin)} />
      <SummaryField label="Margin %" value={formatMarginPercent(marginPercent)} />
    </div>
  )
}
