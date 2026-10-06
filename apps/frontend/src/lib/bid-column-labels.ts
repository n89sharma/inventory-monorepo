import {
  BID_COLUMN_ROLES,
  classifyBidColumns,
  type BidColumn,
  type BidColumnRole,
  type BidDetail,
} from 'shared-types'

const UNKNOWN_COLUMN_LABEL = 'Unknown'
const SAMPLE_MAX_LENGTH = 20
const ELLIPSIS = '…'
const METER_SEPARATORS = /[,\s]/g

const ROLE_LABELS = new Map<BidColumnRole, string>(
  BID_COLUMN_ROLES.map((entry) => [entry.role, entry.label]),
)

export type BidSheet = Pick<BidDetail, 'headers' | 'rows' | 'column_mappings'>

export type LabelledBidColumn = BidColumn & { label: string }

export function parseBidMeterReading(text: string): number | null {
  const digits = text.replace(METER_SEPARATORS, '')
  if (digits === '') return null
  const reading = Number(digits)
  return Number.isFinite(reading) ? reading : null
}

export function bidColumnRoleLabel(role: BidColumnRole): string {
  return ROLE_LABELS.get(role) ?? role
}

function truncateSample(value: string): string {
  if (value.length <= SAMPLE_MAX_LENGTH) return value
  return `${value.slice(0, SAMPLE_MAX_LENGTH)}${ELLIPSIS}`
}

function columnLabel(column: BidColumn, rows: BidSheet['rows']): string {
  if (column.role !== null) return bidColumnRoleLabel(column.role)
  if (column.header !== '') return column.header
  const sample = rows
    .map((row) => row.cells[column.index]?.trim() ?? '')
    .find((value) => value !== '')
  if (sample === undefined) return UNKNOWN_COLUMN_LABEL
  return `${UNKNOWN_COLUMN_LABEL} (${truncateSample(sample)})`
}

export function labelBidColumns(sheet: BidSheet): LabelledBidColumn[] {
  return classifyBidColumns(sheet.headers, sheet.column_mappings).map((column) => ({
    ...column,
    label: columnLabel(column, sheet.rows),
  }))
}
