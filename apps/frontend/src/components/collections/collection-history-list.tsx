import type { CollectionHistory, CollectionHistoryRecord } from 'shared-types'
import {
  EntryHeader,
  FieldChip,
  FieldDiffRow,
  HistoryTimeline,
} from '../asset-details/history-primitives'

type AssetsChangedRecord = Extract<
  CollectionHistoryRecord,
  { action_type: 'ASSETS_ADDED' | 'ASSETS_REMOVED' }
>
type CreateRecord = Extract<CollectionHistoryRecord, { action_type: 'CREATE' }>
type UpdateRecord = Extract<CollectionHistoryRecord, { action_type: 'UPDATE' }>

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function AssetsChangedEntry({ record }: { record: AssetsChangedRecord }) {
  const { barcodes } = record.changes
  const count = barcodes.length
  const plural = count !== 1 ? 's' : ''
  const verb =
    record.action_type === 'ASSETS_ADDED'
      ? `added ${count} asset${plural}`
      : `removed ${count} asset${plural}`
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb={verb} />
      <div className="flex flex-wrap gap-1">
        {barcodes.map((b) => (
          <span key={b} className="text-xs font-mono bg-muted/50 rounded px-2 py-0.5">
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}

function CreateEntry({ record }: { record: CreateRecord }) {
  const after = record.changes as Record<string, unknown>
  const fields = Object.entries(after.after as Record<string, unknown>).filter(
    ([k]) => k !== 'created_at',
  )
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="created" />
      <div className="flex flex-col gap-0.5">
        {fields.map(([key, value]) => (
          <FieldChip key={key} label={formatKey(key)} value={value} />
        ))}
      </div>
    </div>
  )
}

function UpdateEntry({ record }: { record: UpdateRecord }) {
  const { before, after } = record.changes
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="updated" />
      <div className="flex flex-col gap-0.5">
        {Object.keys(after).map((key) => (
          <FieldDiffRow key={key} label={formatKey(key)} before={before[key]} after={after[key]} />
        ))}
      </div>
    </div>
  )
}

function CollectionHistoryEntry({ record }: { record: CollectionHistoryRecord }) {
  if (record.action_type === 'ASSETS_ADDED' || record.action_type === 'ASSETS_REMOVED') {
    return <AssetsChangedEntry record={record} />
  }
  if (record.action_type === 'CREATE') {
    return <CreateEntry record={record} />
  }
  return <UpdateEntry record={record as UpdateRecord} />
}

export function CollectionHistoryList({ history }: { history: CollectionHistory }) {
  return (
    <HistoryTimeline
      items={history}
      renderEntry={(record) => <CollectionHistoryEntry record={record} />}
    />
  )
}
