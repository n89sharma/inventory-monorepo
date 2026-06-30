import { formatWeight } from '@/lib/formatters'
import type { AssetSummary } from 'shared-types'

const sizeFormatter = new Intl.NumberFormat('en-US')

export function AssetTotalsField({ assets }: { assets: AssetSummary[] }) {
  let totalWeight = 0
  let totalSize = 0
  for (const asset of assets) {
    totalWeight += Number.isFinite(asset.weight) ? asset.weight : 0
    totalSize += Number.isFinite(asset.size) ? asset.size : 0
  }

  return (
    <>
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Total Weight</span>
        <span className="font-medium tabular-nums">{formatWeight(totalWeight)}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Total Size</span>
        <span className="font-medium tabular-nums">
          {sizeFormatter.format(Math.round(totalSize))}
        </span>
      </div>
    </>
  )
}
