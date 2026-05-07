import { formatHistoryTimestamp } from '@/lib/formatters'
import type { AssetHistory, AssetHistoryRecord, AssetUpdateDiff } from 'shared-types'

type CreateRecord = Extract<AssetHistoryRecord, { action_type: 'CREATE' }>
type UpdateRecord = Extract<AssetHistoryRecord, { action_type: 'UPDATE' }>

const UPDATE_FIELDS: { key: keyof AssetUpdateDiff; label: string }[] = [
  { key: 'serial_number', label: 'Serial Number' },
  { key: 'arrival_number', label: 'Arrival' },
  { key: 'departure_number', label: 'Departure' },
  { key: 'hold_number', label: 'Hold' },
  { key: 'invoice_number', label: 'Invoice' },
  { key: 'location', label: 'Location' },
  { key: 'model_name', label: 'Model' },
  { key: 'technical_status', label: 'Technical Status' },
  { key: 'meter_black', label: 'Meter Black' },
  { key: 'meter_colour', label: 'Meter Colour' },
  { key: 'cassettes', label: 'Cassettes' },
  { key: 'internal_finisher', label: 'Internal Finisher' },
  { key: 'drum_life_c', label: 'Drum Life C' },
  { key: 'drum_life_m', label: 'Drum Life M' },
  { key: 'drum_life_y', label: 'Drum Life Y' },
  { key: 'drum_life_k', label: 'Drum Life K' },
  { key: 'purchase_cost', label: 'Purchase Cost' },
  { key: 'transport_cost', label: 'Transport Cost' },
  { key: 'processing_cost', label: 'Processing Cost' },
  { key: 'other_cost', label: 'Other Cost' },
  { key: 'parts_cost', label: 'Parts Cost' },
  { key: 'sale_price', label: 'Sale Price' },
  { key: 'error_codes', label: 'Errors' },
]

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return (value as string[]).join(', ')
  return String(value)
}

function FieldDiffRow(
  { label, before, after }: { label: string; before: unknown; after: unknown }
) {
  const beforeStr = formatFieldValue(before)
  const afterStr = formatFieldValue(after)
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span>{beforeStr} → {afterStr}</span>
    </div>
  )
}

function AssetHistoryCreateEntry({ record }: { record: CreateRecord }) {
  const { after } = record.changes
  return (
    <div className="flex justify-between items-start gap-4">
      <p>
        {after.barcode} {after.brand_name} {after.model_name} {after.serial_number} created
        by {record.user_name}
        {after.arrival_number ? ` (arrival ${after.arrival_number})` : ''}
      </p>
      <span className="text-muted-foreground whitespace-nowrap">
        {formatHistoryTimestamp(record.changed_on)}
      </span>
    </div>
  )
}

function AssetHistoryUpdateEntry({ record }: { record: UpdateRecord }) {
  const { before, after } = record.changes
  const changedFields = UPDATE_FIELDS.filter(
    ({ key }) => key in after || key in before
  )
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-start gap-4">
        <p className="font-medium">Asset updated by {record.user_name}</p>
        <span className="text-muted-foreground whitespace-nowrap">
          {formatHistoryTimestamp(record.changed_on)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 pl-2">
        {changedFields.map(({ key, label }) => (
          <FieldDiffRow key={key} label={label} before={before[key]} after={after[key]} />
        ))}
      </div>
    </div>
  )
}

export function AssetHistoryList({ history }: { history: AssetHistory }) {
  if (history.length === 0) {
    return <p className="text-muted-foreground">No history on record</p>
  }
  return (
    <div className="flex flex-col gap-4">
      {history.map((record, i) => (
        record.action_type === 'CREATE'
          ? <AssetHistoryCreateEntry key={i} record={record} />
          : <AssetHistoryUpdateEntry key={i} record={record} />
      ))}
    </div>
  )
}
