import { SummaryField } from '@/components/shared/cards/summary-field'
import { useCan } from '@/hooks/use-can'
import { summariseDepartedAssets } from '@/lib/departed-summary'
import { formatMarginPercent, formatUSDWithSymbol } from '@/lib/formatters'
import type { AssetSearchRow } from 'shared-types'

export function DepartedSummaryStrip({ assets }: { assets: AssetSearchRow[] }): React.ReactNode {
  const canViewProfitability = useCan('view_profitability_report')
  const canViewSalePrice = useCan('view_sale_price')
  const canViewPurchasePrice = useCan('view_purchase_price')
  // The price permissions stay in the guard because the backend redacts the very fields these
  // totals sum: without them every row reads as unpriced and the strip shows a confident zero.
  if (!canViewProfitability || !canViewSalePrice || !canViewPurchasePrice) return null

  const summary = summariseDepartedAssets(assets)
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Gross Revenue" value={formatUSDWithSymbol(summary.grossRevenue)} />
      <SummaryField label="COGS" value={formatUSDWithSymbol(summary.cogs)} />
      <SummaryField label="Gross Margin" value={formatUSDWithSymbol(summary.grossMargin)} />
      <SummaryField label="Margin %" value={formatMarginPercent(summary.marginPercent)} />
      <SummaryField
        label="Assets"
        value={`${summary.pricedAssets} / ${summary.totalAssets} priced`}
      />
    </div>
  )
}
