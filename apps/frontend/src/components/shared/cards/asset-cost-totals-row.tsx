import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/shadcn/hover-card'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { useCan } from '@/hooks/use-can'
import { formatMarginPercent, formatUSDWithSymbol } from '@/lib/formatters'
import { Fragment } from 'react'
import type { AssetSearchRow } from 'shared-types'

type CostTotalFieldId =
  | 'cost_purchase_cost'
  | 'cost_transport_cost'
  | 'cost_transfer_cost'
  | 'cost_processing_cost'
  | 'cost_other_cost'
  | 'cost_parts_cost'
  | 'cost_total_cost'
  | 'cost_sale_price'

const COST_BREAKDOWN_OPEN_DELAY_MS = 200

const COST_BREAKDOWN_FIELDS = [
  { id: 'cost_purchase_cost', label: 'Purchase' },
  { id: 'cost_transport_cost', label: 'Transport' },
  { id: 'cost_transfer_cost', label: 'Transfer' },
  { id: 'cost_processing_cost', label: 'Processing' },
  { id: 'cost_parts_cost', label: 'Parts' },
  { id: 'cost_other_cost', label: 'Other' },
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
    <HoverCard openDelay={COST_BREAKDOWN_OPEN_DELAY_MS}>
      <HoverCardTrigger asChild>
        <div
          tabIndex={0}
          className="flex w-fit flex-wrap items-baseline gap-x-6 gap-y-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SummaryField label="Total Cost" value={formatUSDWithSymbol(totalCost)} />
          <SummaryField label="Sale Price" value={formatUSDWithSymbol(salePrice)} />
          <SummaryField
            label="Margin"
            value={`${formatUSDWithSymbol(grossMargin)} (${formatMarginPercent(marginPercent)})`}
          />
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-56">
        <CostBreakdown assets={assets} totalCost={totalCost} />
      </HoverCardContent>
    </HoverCard>
  )
}

function CostBreakdown({ assets, totalCost }: { assets: AssetSearchRow[]; totalCost: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="font-medium">Cost</div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
        {COST_BREAKDOWN_FIELDS.map((field) => (
          <Fragment key={field.id}>
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="text-right">{formatUSDWithSymbol(sumCost(assets, field.id))}</dd>
          </Fragment>
        ))}
        <dt className="border-t pt-1 font-medium">Total</dt>
        <dd className="border-t pt-1 text-right font-medium">{formatUSDWithSymbol(totalCost)}</dd>
      </dl>
    </div>
  )
}
