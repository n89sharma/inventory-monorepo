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

function isSold(asset: DepartedAssetPrices): boolean {
  return (asset.cost_sale_price ?? 0) > 0
}

// A sale price is the only thing an asset needs to count, matching the profitability report.
// An absent cost is read as zero rather than excluding the sale: by the time an asset carries
// a sale price its costs have been written, and a genuinely costless sale is 100% margin, not
// a row to drop. pricedAssets against totalAssets tells the reader how much of the list the
// money describes.
export function summariseDepartedAssets(assets: readonly DepartedAssetPrices[]): DepartedSummary {
  let grossRevenue = 0
  let cogs = 0
  let pricedAssets = 0

  for (const asset of assets) {
    if (!isSold(asset)) continue
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
