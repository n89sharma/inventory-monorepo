import { AssetCostTotalsRow } from '@/components/shared/cards/asset-cost-totals-row'
import { useCanViewCosts } from '@/hooks/use-can-view-costs'
import type { AssetSearchRow } from 'shared-types'

// Carries its own gutter rather than sitting in a PageSection, so a viewer who cannot see
// costs gets no empty padded band above the grid.
export function CostSummaryStrip({ assets }: { assets: AssetSearchRow[] }) {
  const canViewCosts = useCanViewCosts()
  if (!canViewCosts) return null
  return (
    <div className="w-full shrink-0 px-2 py-1">
      <AssetCostTotalsRow assets={assets} />
    </div>
  )
}
