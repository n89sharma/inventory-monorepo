import { toCsv } from '@/lib/csv'
import type { AssetSearchRow } from 'shared-types'
import { orderedVisibleColumns } from './asset-search-columns'

export function searchPageRowsToCsv(rows: AssetSearchRow[], visibleColumns: Set<string>): string {
  const columns = orderedVisibleColumns(visibleColumns).map((c) => ({
    header: c.label,
    value: c.text,
  }))
  return toCsv(columns, rows)
}
