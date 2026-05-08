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

function EntryHeader(
  { userName, timestamp, verb }: { userName: string; timestamp: Date | string; verb: string }
) {
  return (
    <p className="text-sm">{userName} {verb} {formatHistoryTimestamp(timestamp)}</p>
  )
}

function FieldDiffRow(
  { label, before, after }: { label: string; before: unknown; after: unknown }
) {
  const beforeStr = formatFieldValue(before)
  const afterStr = formatFieldValue(after)
  const hadBefore = beforeStr !== ''
  const hasAfter = afterStr !== ''

  let content: React.ReactNode
  if (!hadBefore && hasAfter) {
    content = (
      <>
        <span className="text-muted-foreground">Added</span>{' '}
        {label} <span className="font-medium">{afterStr}</span>
      </>
    )
  } else if (hadBefore && !hasAfter) {
    content = (
      <>
        <span className="text-muted-foreground">Removed</span>{' '}
        {label} <span className="font-medium">{beforeStr}</span>
      </>
    )
  } else {
    content = (
      <>
        {label}{' '}
        <span className="text-muted-foreground">{beforeStr}</span>
        {' → '}
        <span className="font-medium">{afterStr}</span>
      </>
    )
  }

  return (
    <div className="text-sm font-mono bg-muted/50 rounded px-2 py-0.5">
      {content}
    </div>
  )
}

function AssetHistoryCreateEntry({ record }: { record: CreateRecord }) {
  return (
    <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="created" />
  )
}

function AssetHistoryUpdateEntry({ record }: { record: UpdateRecord }) {
  const { before, after } = record.changes
  const changedFields = UPDATE_FIELDS.filter(
    ({ key }) => key in after || key in before
  )
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="updated" />
      <div className="flex flex-col gap-0.5">
        {changedFields.map(({ key, label }) => (
          <FieldDiffRow key={key} label={label} before={before[key]} after={after[key]} />
        ))}
      </div>
    </div>
  )
}

export function AssetHistoryList({ history }: { history: AssetHistory }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No history on record</p>
  }
  return (
    <ol className="flex flex-col gap-6 ml-4">
      {history.map((record, i) => (
        <li key={i} className="relative pl-6">
          <span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-muted ring-4 ring-card border border-border" />
          {i < history.length - 1 && (
            <span className="absolute left-1.5 top-4 bottom-[-1.5rem] w-px bg-border" />
          )}
          {record.action_type === 'CREATE'
            ? <AssetHistoryCreateEntry record={record} />
            : <AssetHistoryUpdateEntry record={record} />
          }
        </li>
      ))}
    </ol>
  )
}
