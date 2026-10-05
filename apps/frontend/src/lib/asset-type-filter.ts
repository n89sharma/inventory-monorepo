export const ASSET_TYPE_FILTER_VALUES = ['all', 'copier', 'finisher', 'accessory', 'other'] as const

export type AssetTypeFilter = (typeof ASSET_TYPE_FILTER_VALUES)[number]

export type AssetTypeCounts = Record<AssetTypeFilter, number>

// Raw database casing; the title-cased reference-data value ('Copier') would never match.
const FILTER_BY_ASSET_TYPE = new Map<string, Exclude<AssetTypeFilter, 'all' | 'other'>>([
  ['COPIER', 'copier'],
  ['FINISHER', 'finisher'],
  ['ACCESSORY', 'accessory'],
])

export const ASSET_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'copier', label: 'Copiers' },
  { value: 'finisher', label: 'Finishers' },
  { value: 'accessory', label: 'Accessories' },
  { value: 'other', label: 'Other' },
] as const satisfies readonly { value: AssetTypeFilter; label: string }[]

function assetTypeFilterFor(assetType: string): Exclude<AssetTypeFilter, 'all'> {
  return FILTER_BY_ASSET_TYPE.get(assetType) ?? 'other'
}

export function countAssetTypes(assets: { asset_type: string }[]): AssetTypeCounts {
  const counts: AssetTypeCounts = {
    all: assets.length,
    copier: 0,
    finisher: 0,
    accessory: 0,
    other: 0,
  }
  for (const asset of assets) counts[assetTypeFilterFor(asset.asset_type)] += 1
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
  return assets.filter((asset) => assetTypeFilterFor(asset.asset_type) === filter)
}
