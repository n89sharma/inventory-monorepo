import { formatHistoryTimestamp } from '@/lib/formatters'
import type { CollectionHistory, CollectionHistoryRecord } from 'shared-types'

type AssetsChangedRecord = Extract<CollectionHistoryRecord, { action_type: 'ASSETS_ADDED' | 'ASSETS_REMOVED' }>
type CreateRecord = Extract<CollectionHistoryRecord, { action_type: 'CREATE' }>
type UpdateRecord = Extract<CollectionHistoryRecord, { action_type: 'UPDATE' }>

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
  const fmt = (v: unknown) => v == null ? '' : String(v)
  const beforeStr = fmt(before)
  const afterStr = fmt(after)
  const hadBefore = beforeStr !== ''
  const hasAfter = afterStr !== ''

  let content: React.ReactNode
  if (!hadBefore && hasAfter) {
    content = <><span className="text-muted-foreground">Added</span>{' '}{label} <span className="font-medium">{afterStr}</span></>
  } else if (hadBefore && !hasAfter) {
    content = <><span className="text-muted-foreground">Removed</span>{' '}{label} <span className="font-medium">{beforeStr}</span></>
  } else {
    content = <>{label}{' '}<span className="text-muted-foreground">{beforeStr}</span>{' → '}<span className="font-medium">{afterStr}</span></>
  }

  return (
    <div className="text-sm font-mono bg-muted/50 rounded px-2 py-0.5">{content}</div>
  )
}

function AssetsChangedEntry({ record }: { record: AssetsChangedRecord }) {
  const { barcodes } = record.changes
  const count = barcodes.length
  const verb = record.action_type === 'ASSETS_ADDED'
    ? `added ${count} asset${count !== 1 ? 's' : ''}`
    : `removed ${count} asset${count !== 1 ? 's' : ''}`
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb={verb} />
      <div className="flex flex-wrap gap-1">
        {barcodes.map(b => (
          <span key={b} className="text-xs font-mono bg-muted/50 rounded px-2 py-0.5">{b}</span>
        ))}
      </div>
    </div>
  )
}

function CreateEntry({ record }: { record: CreateRecord }) {
  const after = record.changes as Record<string, unknown>
  const fields = Object.entries(after.after as Record<string, unknown>)
    .filter(([k]) => k !== 'created_at')
  return (
    <div className="flex flex-col gap-1.5">
      <EntryHeader userName={record.user_name} timestamp={record.changed_on} verb="created" />
      <div className="flex flex-col gap-0.5">
        {fields.map(([key, value]) => (
          <div key={key} className="text-sm font-mono bg-muted/50 rounded px-2 py-0.5">
            <span className="text-muted-foreground">{formatKey(key)}</span>{' '}
            <span className="font-medium">{String(value ?? '')}</span>
          </div>
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
        {Object.keys(after).map(key => (
          <FieldDiffRow
            key={key}
            label={formatKey(key)}
            before={before[key]}
            after={after[key]}
          />
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
          <CollectionHistoryEntry record={record} />
        </li>
      ))}
    </ol>
  )
}
