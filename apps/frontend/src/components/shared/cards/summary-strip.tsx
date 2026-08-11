import { AssetCostTotalsRow } from '@/components/shared/cards/asset-cost-totals-row'
import type { AssetSearchRow } from 'shared-types'

export function SummaryStrip({
  assets,
  children,
}: {
  assets: AssetSearchRow[]
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 px-2">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">{children}</div>
      <AssetCostTotalsRow assets={assets} />
    </div>
  )
}
