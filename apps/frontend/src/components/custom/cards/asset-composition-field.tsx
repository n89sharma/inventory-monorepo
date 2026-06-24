import type { AssetSummary } from 'shared-types'

const ASSET_TYPE_LABELS = [
  { type: 'COPIER', label: 'Copiers' },
  { type: 'FINISHER', label: 'Finishers' },
  { type: 'ACCESSORY', label: 'Accessories' },
] as const

const OTHER_LABEL = 'Other'

export function AssetCompositionField({ assets }: { assets: AssetSummary[] }) {
  const total = assets.length
  const counts = new Map<string, number>()
  for (const asset of assets) {
    counts.set(asset.asset_type, (counts.get(asset.asset_type) ?? 0) + 1)
  }

  const knownParts = ASSET_TYPE_LABELS.map(({ type, label }) => ({
    label,
    count: counts.get(type) ?? 0,
  }))
  const otherCount = total - knownParts.reduce((sum, part) => sum + part.count, 0)
  const parts = [...knownParts, { label: OTHER_LABEL, count: otherCount }].filter(
    (part) => part.count > 0,
  )

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">Assets</span>
      <span className="font-medium tabular-nums">{total}</span>
      {parts.length > 0 ? (
        <span className="text-muted-foreground">
          — {parts.map((part) => `${part.count} ${part.label}`).join(' · ')}
        </span>
      ) : null}
    </div>
  )
}
