import type { AssetHistory, AssetHistoryRecord, AssetUpdateDiff } from 'shared-types'
import {
  EntryHeader,
  FieldDiffRow,
  HistoryTimeline
} from './history/history-primitives'

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
  return (
    <HistoryTimeline
      items={history}
      renderEntry={(record) => (
        record.action_type === 'CREATE'
          ? <AssetHistoryCreateEntry record={record} />
          : <AssetHistoryUpdateEntry record={record} />
      )}
    />
  )
}
