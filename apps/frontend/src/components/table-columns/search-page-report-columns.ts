import { toCsv } from '@/lib/csv'
import type { AssetSearchRow } from 'shared-types'
import { ASSET_SEARCH_COLUMNS } from './asset-search-columns'

export function searchPageRowsToCsv(rows: AssetSearchRow[], visibleColumns: Set<string>): string {
  const columns = ASSET_SEARCH_COLUMNS.filter(
    (c) => c.alwaysVisible || visibleColumns.has(c.id),
  ).map((c) => ({ header: c.label, value: c.text }))
  return toCsv(columns, rows)
}
