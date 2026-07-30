import { SummaryField } from '@/components/shared/cards/summary-field'
import { useCan } from '@/hooks/use-can'
import { summariseDepartedAssets } from '@/lib/departed-summary'
import { formatMarginPercent, formatUSDWithSymbol } from '@/lib/formatters'
import type { AssetSearchRow } from 'shared-types'

export function DepartedSummaryStrip({ assets }: { assets: AssetSearchRow[] }): React.ReactNode {
  const canViewSalePrice = useCan('view_sale_price')
  const canViewPurchasePrice = useCan('view_purchase_price')
  if (!canViewSalePrice || !canViewPurchasePrice) return null

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
