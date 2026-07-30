import type { AssetSearchRow } from 'shared-types'

// Exactly the fields the totals read, so a test row cannot drift from what is aggregated.
type DepartedAssetPrices = Pick<AssetSearchRow, 'cost_sale_price' | 'cost_total_cost'>

export type DepartedSummary = {
  totalAssets: number
  pricedAssets: number
  grossRevenue: number
  cogs: number
  grossMargin: number
  marginPercent: number
}

function hasNonZeroPrices(asset: DepartedAssetPrices): boolean {
  return (asset.cost_sale_price ?? 0) > 0 && (asset.cost_total_cost ?? 0) > 0
}

// Money is summed only over assets carrying both a cost and a sale price, matching the
// profitability report, so a half-priced asset cannot inflate the margin. pricedAssets
// against totalAssets is what tells the reader how much of the list the money describes.
export function summariseDepartedAssets(assets: readonly DepartedAssetPrices[]): DepartedSummary {
  let grossRevenue = 0
  let cogs = 0
  let pricedAssets = 0

  for (const asset of assets) {
    if (!hasNonZeroPrices(asset)) continue
    grossRevenue += asset.cost_sale_price ?? 0
    cogs += asset.cost_total_cost ?? 0
    pricedAssets += 1
  }

  const grossMargin = grossRevenue - cogs
  return {
    totalAssets: assets.length,
    pricedAssets,
    grossRevenue,
    cogs,
    grossMargin,
    marginPercent: grossRevenue === 0 ? 0 : (grossMargin / grossRevenue) * 100,
  }
}
