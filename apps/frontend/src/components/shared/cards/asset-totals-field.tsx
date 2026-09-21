import { SummaryValue } from '@/components/shared/cards/summary-value'
import { formatWeight } from '@/lib/formatters'

const SIZE_UNIT = 'ft'

const sizeFormatter = new Intl.NumberFormat('en-US')

export function AssetTotalsField({ assets }: { assets: { weight: number; size: number }[] }) {
  let totalWeight = 0
  let totalSize = 0
  for (const asset of assets) {
    totalWeight += Number.isFinite(asset.weight) ? asset.weight : 0
    totalSize += Number.isFinite(asset.size) ? asset.size : 0
  }

  return (
    <>
      <SummaryValue value={formatWeight(totalWeight)} />
      <SummaryValue value={`${sizeFormatter.format(Math.round(totalSize))} ${SIZE_UNIT}`} />
    </>
  )
}
