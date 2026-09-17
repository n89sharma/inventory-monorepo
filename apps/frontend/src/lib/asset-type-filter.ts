export const ASSET_TYPE_FILTER_VALUES = ['all', 'copier', 'finisher', 'accessory'] as const

export type AssetTypeFilter = (typeof ASSET_TYPE_FILTER_VALUES)[number]

export type AssetTypeCounts = Record<AssetTypeFilter, number>

// Raw database casing; the title-cased reference-data value ('Copier') would never match.
const ASSET_TYPE_BY_FILTER = {
  copier: 'COPIER',
  finisher: 'FINISHER',
  accessory: 'ACCESSORY',
} as const satisfies Record<Exclude<AssetTypeFilter, 'all'>, string>

export const ASSET_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'copier', label: 'Copiers' },
  { value: 'finisher', label: 'Finishers' },
  { value: 'accessory', label: 'Accessories' },
] as const satisfies readonly { value: AssetTypeFilter; label: string }[]

export function countAssetTypes(assets: { asset_type: string }[]): AssetTypeCounts {
  const counts: AssetTypeCounts = { all: assets.length, copier: 0, finisher: 0, accessory: 0 }
  for (const asset of assets) {
    if (asset.asset_type === ASSET_TYPE_BY_FILTER.copier) counts.copier += 1
    else if (asset.asset_type === ASSET_TYPE_BY_FILTER.finisher) counts.finisher += 1
    else if (asset.asset_type === ASSET_TYPE_BY_FILTER.accessory) counts.accessory += 1
  }
  return counts
}

export function resolveAssetTypeFilter(
  param: AssetTypeFilter | null,
  counts: AssetTypeCounts,
): AssetTypeFilter {
  if (param !== null) return param
  if (counts.copier > 0) return 'copier'
  return 'all'
}

export function filterAssetsByType<T extends { asset_type: string }>(
  assets: T[],
  filter: AssetTypeFilter,
): T[] {
  if (filter === 'all') return assets
  const assetType = ASSET_TYPE_BY_FILTER[filter]
  return assets.filter((asset) => asset.asset_type === assetType)
}
