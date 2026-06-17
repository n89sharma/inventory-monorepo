import { stringify } from 'csv-stringify/sync'
import { ROLE_PERMISSIONS, type AppRole, type AssetDetails } from 'shared-types'
import { ValidationError } from '../lib/errors.js'
import { ASSET_COLUMNS, type AssetColumnKey } from '../reporting/asset-columns.js'
import type { ColumnDescriptor } from '../reporting/column-descriptor.js'

function resolveAssetColumns(
  keys: readonly string[],
  role: AppRole | null,
): ColumnDescriptor<AssetDetails>[] {
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const resolved: ColumnDescriptor<AssetDetails>[] = []
  for (const key of keys) {
    if (!(key in ASSET_COLUMNS)) {
      throw new ValidationError(`Unknown asset report column: ${key}`)
    }
    const col: ColumnDescriptor<AssetDetails> = ASSET_COLUMNS[key as AssetColumnKey]
    if (col.permission && !permissions.includes(col.permission)) continue
    resolved.push(col)
  }
  return resolved
}

function flattenRow(
  row: AssetDetails,
  columns: ColumnDescriptor<AssetDetails>[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of columns) {
    const raw = col.accessor(row)
    out[col.key] = col.format ? col.format(raw) : raw
  }
  return out
}

export function generateCsvReport(
  columnKeys: readonly string[],
  rows: AssetDetails[],
  role: AppRole | null,
): string {
  const columns = resolveAssetColumns(columnKeys, role)
  const flatRows = rows.map(r => flattenRow(r, columns))
  return stringify(flatRows, {
    header: true,
    columns: columns.map(c => ({ key: c.key, header: c.header })),
  })
}
