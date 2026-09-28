import { COST_FIELD_LABELS } from '@/lib/cost-fields'
import { formatDamaged, formatTitleCase } from '@/lib/formatters'
import type {
  AssetHistory,
  AssetHistoryRecord,
  AssetUpdateDiff,
  ErrorsChanged,
  LocationParts,
  PartAdded,
} from 'shared-types'
import { getReadinessDisplay } from '../shared/readiness/readiness-config'
import { EntryHeader, FieldChip, FieldDiffRow, HistoryTimeline } from './history-primitives'

type CreateRecord = Extract<AssetHistoryRecord, { action_type: 'CREATE' }>
type UpdateRecord = Extract<AssetHistoryRecord, { action_type: 'UPDATE' }>
type ErrorsChangedRecord = Extract<AssetHistoryRecord, { action_type: 'ERRORS_CHANGED' }>
type PartAddedRecord = Extract<AssetHistoryRecord, { action_type: 'PART_ADDED' }>
type PartHarvestedRecord = Extract<AssetHistoryRecord, { action_type: 'PART_HARVESTED' }>
type TransferMovementRecord = Extract<
  AssetHistoryRecord,
  {
    action_type:
      | 'TRANSFER_DISPATCHED'
      | 'TRANSFER_RECEIVED'
      | 'TRANSFER_RETURNED'
      | 'TRANSFER_ASSET_LOADED'
      | 'TRANSFER_ASSET_UNLOADED'
      | 'TRANSFER_ASSET_MARKED_MISSING'
      | 'TRANSFER_ASSET_LOAD_UNDONE'
      | 'TRANSFER_ASSET_UNLOAD_UNDONE'
  }
>

const IN_TRANSIT_LABEL = 'In transit'
const EXCHANGE_YES = 'Yes'
const EXCHANGE_NO = 'No'

const formatReadinessDiff = (value: unknown) =>
  typeof value === 'string' ? getReadinessDisplay(value) : value

const formatDamagedDiff = (value: unknown) =>
  typeof value === 'boolean' ? formatDamaged(value) : value

const formatStatusDiff = (value: unknown) =>
  typeof value === 'string' ? formatTitleCase(value) : value

type UpdateField = {
  label: string
  format?: (value: unknown) => unknown
}

const UPDATE_FIELDS = {
  serial_number: { label: 'Serial Number' },
  arrival_number: { label: 'Arrival' },
  departure_number: { label: 'Departure' },
  hold_number: { label: 'Hold' },
  transfer_number: { label: 'Transfer' },
  purchase_invoice_reference: { label: 'Purchase Invoice' },
  sales_invoice_reference: { label: 'Sales Invoice' },
  warehouse: { label: 'Warehouse' },
  zone: { label: 'Zone' },
  bin: { label: 'Bin' },
  model_name: { label: 'Model' },
  status: { label: 'Status', format: formatStatusDiff },
  readiness: { label: 'Readiness', format: formatReadinessDiff },
  manufactured_year: { label: 'Manufactured Year' },
  country_of_origin: { label: 'Country of Origin' },
  meter_black: { label: 'Meter Black' },
  meter_colour: { label: 'Meter Colour' },
  meter_total: { label: 'Meter Total' },
  cassettes: { label: 'Cassettes' },
  internal_finisher: { label: 'Internal Finisher' },
  drum_life_c: { label: 'Drum Life C' },
  drum_life_m: { label: 'Drum Life M' },
  drum_life_y: { label: 'Drum Life Y' },
  drum_life_k: { label: 'Drum Life K' },
  toner_life_c: { label: 'Toner Life C' },
  toner_life_m: { label: 'Toner Life M' },
  toner_life_y: { label: 'Toner Life Y' },
  toner_life_k: { label: 'Toner Life K' },
  is_damaged: { label: 'Damaged', format: formatDamagedDiff },
  damage_notes: { label: 'Damage Notes' },
  purchase_cost: { label: COST_FIELD_LABELS.purchase_cost },
  transport_cost: { label: COST_FIELD_LABELS.transport_cost },
  transfer_cost: { label: COST_FIELD_LABELS.transfer_cost },
  processing_cost: { label: COST_FIELD_LABELS.processing_cost },
  other_cost: { label: COST_FIELD_LABELS.other_cost },
  parts_cost: { label: COST_FIELD_LABELS.parts_cost },
  total_cost: { label: 'Total Cost' },
  sale_price: { label: COST_FIELD_LABELS.sale_price },
  error_codes: { label: 'Errors' },
} satisfies Record<keyof AssetUpdateDiff, UpdateField>

const ERROR_CHANGE_GROUPS = [
  { key: 'added', label: 'Errors Added' },
  { key: 'fixed', label: 'Errors Fixed' },
  { key: 'reopened', label: 'Errors Reopened' },
  { key: 'removed', label: 'Errors Removed' },
] as const satisfies ReadonlyArray<{ key: keyof ErrorsChanged; label: string }>

const TRANSFER_MOVEMENT_VERBS = {
  TRANSFER_DISPATCHED: 'dispatched',
  TRANSFER_RECEIVED: 'received',
  TRANSFER_RETURNED: 'returned to origin',
  TRANSFER_ASSET_LOADED: 'loaded',
  TRANSFER_ASSET_UNLOADED: 'unloaded',
  TRANSFER_ASSET_MARKED_MISSING: 'marked missing',
  TRANSFER_ASSET_LOAD_UNDONE: 'load undone',
  TRANSFER_ASSET_UNLOAD_UNDONE: 'unload undone',
} as const satisfies Record<TransferMovementRecord['action_type'], string>

function formatExchange(isExchange: boolean): string {
  if (isExchange) return EXCHANGE_YES
  return EXCHANGE_NO
}

function formatLocationParts(location: LocationParts): string {
  const parts = [location.warehouse, location.zone, location.bin].filter(Boolean)
  if (parts.length === 0) return IN_TRANSIT_LABEL
  return parts.join(' / ')
}

function EntryBody({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5">{children}</div>
}

function AssetHistoryCreateEntry({ record }: { record: CreateRecord }) {
  const { barcode, serial_number, brand_name, model_name, arrival_number } = record.changes.after
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="created" />
      <EntryBody>
        <FieldChip label="Barcode" value={barcode} />
        <FieldChip label="Serial Number" value={serial_number} />
        <FieldChip label="Model" value={[brand_name, model_name].filter(Boolean).join(' ')} />
        {arrival_number != null && <FieldChip label="Arrival" value={arrival_number} />}
      </EntryBody>
    </div>
  )
}

function AssetHistoryUpdateEntry({ record }: { record: UpdateRecord }) {
  const before: Record<string, unknown> = record.changes.before
  const after: Record<string, unknown> = record.changes.after
  const changedFields = Object.entries<UpdateField>(UPDATE_FIELDS).filter(
    ([key]) => key in after || key in before,
  )
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="updated" />
      <EntryBody>
        {changedFields.map(([key, field]) => (
          <FieldDiffRow
            key={key}
            label={field.label}
            before={before[key]}
            after={after[key]}
            format={field.format}
          />
        ))}
      </EntryBody>
    </div>
  )
}

function ErrorsChangedEntry({ record }: { record: ErrorsChangedRecord }) {
  const groups = ERROR_CHANGE_GROUPS.filter(({ key }) => record.changes[key].length > 0)
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader
        userName={record.user_name}
        timestamp={record.changed_on}
        verb="updated errors"
      />
      <EntryBody>
        {groups.map(({ key, label }) => (
          <FieldChip key={key} label={label} value={record.changes[key]} />
        ))}
      </EntryBody>
    </div>
  )
}

function PartAddedDetails({ part }: { part: PartAdded }) {
  if (part.source === 'store') {
    return (
      <EntryBody>
        <FieldChip label="Part Number" value={part.part_number} />
        <FieldChip label="Quantity" value={part.quantity} />
      </EntryBody>
    )
  }
  return (
    <EntryBody>
      <FieldChip label="Part" value={part.part} />
      <FieldChip label="From" value={part.donor_barcode} />
      <FieldChip label="Exchange" value={formatExchange(part.is_exchange)} />
    </EntryBody>
  )
}

function PartAddedEntry({ record }: { record: PartAddedRecord }) {
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="added a part" />
      <PartAddedDetails part={record.changes} />
    </div>
  )
}

function PartHarvestedEntry({ record }: { record: PartHarvestedRecord }) {
  const { part, recipient_barcode, is_exchange } = record.changes
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader
        userName={record.user_name}
        timestamp={record.changed_on}
        verb="harvested a part"
      />
      <EntryBody>
        <FieldChip label="Part" value={part} />
        <FieldChip label="For" value={recipient_barcode} />
        <FieldChip label="Exchange" value={formatExchange(is_exchange)} />
      </EntryBody>
    </div>
  )
}

function TransferMovementEntry({ record }: { record: TransferMovementRecord }) {
  const { transfer_number, origin_city_code, destination_city_code, before, after } = record.changes
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader
        userName={record.user_name}
        timestamp={record.changed_on}
        verb={TRANSFER_MOVEMENT_VERBS[record.action_type]}
      />
      <EntryBody>
        <FieldChip label="Transfer" value={transfer_number} />
        <FieldChip label="Route" value={`${origin_city_code} → ${destination_city_code}`} />
        <FieldChip label="From" value={formatLocationParts(before)} />
        <FieldChip label="To" value={formatLocationParts(after)} />
      </EntryBody>
    </div>
  )
}

function AssetHistoryEntry({ record }: { record: AssetHistoryRecord }) {
  if (record.action_type === 'CREATE') return <AssetHistoryCreateEntry record={record} />
  if (record.action_type === 'ERRORS_CHANGED') return <ErrorsChangedEntry record={record} />
  if (record.action_type === 'PART_ADDED') return <PartAddedEntry record={record} />
  if (record.action_type === 'PART_HARVESTED') return <PartHarvestedEntry record={record} />
  if (record.action_type === 'UPDATE') return <AssetHistoryUpdateEntry record={record} />
  return <TransferMovementEntry record={record} />
}

export function AssetHistoryList({ history }: { history: AssetHistory }) {
  return (
    <HistoryTimeline
      items={history}
      renderEntry={(record) => <AssetHistoryEntry record={record} />}
    />
  )
}
