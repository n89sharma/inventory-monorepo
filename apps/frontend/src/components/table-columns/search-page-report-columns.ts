import { toCsv } from '@/lib/csv'
import type { AssetSearchRow } from 'shared-types'
import { orderedVisibleColumns } from './asset-search-columns'

export function searchPageRowsToCsv(rows: AssetSearchRow[], orderedIds: readonly string[]): string {
  const columns = orderedVisibleColumns(orderedIds).map((c) => ({
    header: c.csvHeader ?? c.label,
    value: c.text,
  }))
  return toCsv(columns, rows)
}
