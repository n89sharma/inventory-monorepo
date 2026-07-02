import type { AssetHistory, AssetHistoryRecord, AssetUpdateDiff } from 'shared-types'
import { getReadinessDisplay } from '../shared/readiness/readiness-config'
import { EntryHeader, FieldDiffRow, HistoryTimeline } from './history-primitives'

type CreateRecord = Extract<AssetHistoryRecord, { action_type: 'CREATE' }>
type UpdateRecord = Extract<AssetHistoryRecord, { action_type: 'UPDATE' }>

const formatReadinessDiff = (value: unknown) =>
  typeof value === 'string' ? getReadinessDisplay(value) : value

type UpdateField = {
  key: keyof AssetUpdateDiff
  label: string
  format?: (value: unknown) => unknown
}

const UPDATE_FIELDS: UpdateField[] = [
  { key: 'serial_number', label: 'Serial Number' },
  { key: 'arrival_number', label: 'Arrival' },
  { key: 'departure_number', label: 'Departure' },
  { key: 'hold_number', label: 'Hold' },
  { key: 'invoice_number', label: 'Invoice' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'zone', label: 'Zone' },
  { key: 'bin', label: 'Bin' },
  { key: 'model_name', label: 'Model' },
  { key: 'readiness', label: 'Readiness', format: formatReadinessDiff },
  { key: 'meter_black', label: 'Meter Black' },
  { key: 'meter_colour', label: 'Meter Colour' },
  { key: 'cassettes', label: 'Cassettes' },
  { key: 'internal_finisher', label: 'Internal Finisher' },
  { key: 'drum_life_c', label: 'Drum Life C' },
  { key: 'drum_life_m', label: 'Drum Life M' },
  { key: 'drum_life_y', label: 'Drum Life Y' },
  { key: 'drum_life_k', label: 'Drum Life K' },
  { key: 'toner_life_c', label: 'Toner Life C' },
  { key: 'toner_life_m', label: 'Toner Life M' },
  { key: 'toner_life_y', label: 'Toner Life Y' },
  { key: 'toner_life_k', label: 'Toner Life K' },
  { key: 'purchase_cost', label: 'Purchase Cost' },
  { key: 'transport_cost', label: 'Transport Cost' },
  { key: 'processing_cost', label: 'Processing Cost' },
  { key: 'other_cost', label: 'Other Cost' },
  { key: 'parts_cost', label: 'Parts Cost' },
  { key: 'sale_price', label: 'Sale Price' },
  { key: 'error_codes', label: 'Errors' },
]

function AssetHistoryCreateEntry({ record }: { record: CreateRecord }) {
  return <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="created" />
}

function AssetHistoryUpdateEntry({ record }: { record: UpdateRecord }) {
  const { before, after } = record.changes
  const changedFields = UPDATE_FIELDS.filter(({ key }) => key in after || key in before)
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="updated" />
      <div className="flex flex-col gap-0.5">
        {changedFields.map(({ key, label, format }) => (
          <FieldDiffRow
            key={key}
            label={label}
            before={before[key]}
            after={after[key]}
            format={format}
          />
        ))}
      </div>
    </div>
  )
}

export function AssetHistoryList({ history }: { history: AssetHistory }) {
  return (
    <HistoryTimeline
      items={history}
      renderEntry={(record) =>
        record.action_type === 'CREATE' ? (
          <AssetHistoryCreateEntry record={record} />
        ) : (
          <AssetHistoryUpdateEntry record={record} />
        )
      }
    />
  )
}
