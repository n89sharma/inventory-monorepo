import type { AssetSummary } from 'shared-types'

export function mergeAssets(
  existing: AssetSummary[],
  toAdd: AssetSummary[]
): { merged: AssetSummary[]; added: number; skipped: number } {
  const existingIds = new Set(existing.map(a => a.id))
  const newOnly = toAdd.filter(a => !existingIds.has(a.id))
  return { merged: [...existing, ...newOnly], added: newOnly.length, skipped: toAdd.length - newOnly.length }
}
