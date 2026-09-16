import type { AssetSearchRow } from 'shared-types'

const MAX_NAMED_GROUPS = 3

export const VENDOR_MISMATCH_TITLE = 'Vendor mismatch'
export const CUSTOMER_MISMATCH_TITLE = 'Customer mismatch'

type CounterpartyLink = {
  reference: string
  counterparty: { id: number; name: string }
}

type CounterpartyMismatch = { barcode: string; link: CounterpartyLink }

export type CounterpartyWarning = {
  title: string
  summary: string
  assetWarnings: ReadonlyMap<string, string>
}

type CounterpartyWarningSpec = {
  title: string
  assets: AssetSearchRow[]
  expectedCounterpartyId: number
  linkOf: (asset: AssetSearchRow) => CounterpartyLink | null
  description: string
  groupLabelOf: (link: CounterpartyLink) => string
  assetMessageOf: (link: CounterpartyLink) => string
}

function findCounterpartyMismatches(
  assets: AssetSearchRow[],
  expectedCounterpartyId: number,
  linkOf: (asset: AssetSearchRow) => CounterpartyLink | null,
): CounterpartyMismatch[] {
  return assets.flatMap((asset) => {
    const link = linkOf(asset)
    if (!link || link.counterparty.id === expectedCounterpartyId) return []
    return [{ barcode: asset.barcode, link }]
  })
}

function formatGroupCounts(labels: string[]): string {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  const groups = [...counts].sort(
    ([labelA, countA], [labelB, countB]) => countB - countA || labelA.localeCompare(labelB),
  )
  const named = groups.slice(0, MAX_NAMED_GROUPS).map(([label, count]) => `${label} (${count})`)
  const hiddenCount = groups.length - named.length
  if (hiddenCount > 0) named.push(`+${hiddenCount} more`)
  return named.join(', ')
}

export function buildCounterpartyWarning({
  title,
  assets,
  expectedCounterpartyId,
  linkOf,
  description,
  groupLabelOf,
  assetMessageOf,
}: CounterpartyWarningSpec): CounterpartyWarning | null {
  const mismatches = findCounterpartyMismatches(assets, expectedCounterpartyId, linkOf)
  if (mismatches.length === 0) return null
  const groups = formatGroupCounts(mismatches.map((mismatch) => groupLabelOf(mismatch.link)))
  return {
    title,
    summary: `${mismatches.length} of ${assets.length} assets ${description}: ${groups}.`,
    assetWarnings: new Map(
      mismatches.map((mismatch) => [mismatch.barcode, assetMessageOf(mismatch.link)]),
    ),
  }
}
