import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  bidColumnRoleLabel,
  labelBidColumns,
  type BidSheet,
  type LabelledBidColumn,
} from '@/lib/bid-column-labels'
import { ArrowRightIcon, CheckCircleIcon, ColumnsIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import {
  BID_COLUMN_ROLE,
  BID_COLUMN_ROLES,
  BidColumnRoleSchema,
  type BidColumnMapping,
  type BidColumnRole,
} from 'shared-types'

const CORE_ROLES: BidColumnRole[] = [
  BID_COLUMN_ROLE.MODEL,
  BID_COLUMN_ROLE.SERIAL,
  BID_COLUMN_ROLE.TOTAL_METER,
]
const CORE_MAPPED_MESSAGE = 'Model, Serial # and Total Meter are mapped.'
const UNMAPPED_PLACEHOLDER = 'Not mapped'

type DraftMappings = ReadonlyMap<number, BidColumnRole>

function toDraft(mappings: readonly BidColumnMapping[]): DraftMappings {
  return new Map(mappings.map((mapping) => [mapping.column_index, mapping.role]))
}

function toMappings(draft: DraftMappings): BidColumnMapping[] {
  return [...draft]
    .map(([column_index, role]) => ({ column_index, role }))
    .sort((a, b) => a.column_index - b.column_index)
}

function sameDraft(prevDraft: DraftMappings, currDraft: DraftMappings): boolean {
  if (prevDraft.size !== currDraft.size) return false
  return [...currDraft].every(([index, role]) => prevDraft.get(index) === role)
}

interface MapBidColumnsDialogProps {
  bid: BidSheet
  onSave: (mappings: BidColumnMapping[]) => Promise<void>
}

export function MapBidColumnsDialog({ bid, onSave }: MapBidColumnsDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [columns, setColumns] = useState<LabelledBidColumn[]>([])
  const [draft, setDraft] = useState<DraftMappings>(new Map())
  const [saving, setSaving] = useState(false)
  const savedDraft = toDraft(bid.column_mappings)
  const guard = useUnsavedChangesGuard(!sameDraft(savedDraft, draft), setOpen)

  const automaticRoles = columns.flatMap((column) =>
    column.source === 'automatic' ? [column.role] : [],
  )
  const takenRoles = new Set([...automaticRoles, ...draft.values()])
  const coreMapped = CORE_ROLES.every((role) => takenRoles.has(role))

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setColumns(labelBidColumns(bid))
      setDraft(savedDraft)
    }
    guard.onOpenChange(newOpen)
  }

  function setColumnRole(columnIndex: number, role: BidColumnRole | null) {
    setDraft((prevDraft) => {
      const newDraft = new Map(prevDraft)
      if (role === null) newDraft.delete(columnIndex)
      else newDraft.set(columnIndex, role)
      return newDraft
    })
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(toMappings(draft))
      setOpen(false)
    } catch {
      // interceptor surfaced the error toast — keep the dialog open
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(true)}>
        <ColumnsIcon />
        Map Columns
      </Button>
      <Dialog open={open} onOpenChange={saving ? undefined : handleOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Column mapping</DialogTitle>
            <DialogDescription>
              Choose what each vendor column holds. Recognised columns are fixed.
            </DialogDescription>
          </DialogHeader>
          {coreMapped && <CoreMappedBar />}
          <ul className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1">
            {columns.map((column) => (
              <ColumnMappingRow
                key={column.index}
                column={column}
                role={draft.get(column.index) ?? null}
                takenRoles={takenRoles}
                disabled={saving}
                onRoleChange={(role) => setColumnRole(column.index, role)}
              />
            ))}
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => guard.onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
        <UnsavedChangesDialog
          open={guard.confirmOpen}
          onOpenChange={guard.setConfirmOpen}
          onDiscard={guard.discard}
        />
      </Dialog>
    </>
  )
}

function CoreMappedBar(): React.JSX.Element {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
    >
      <CheckCircleIcon aria-hidden="true" className="size-4 shrink-0" />
      {CORE_MAPPED_MESSAGE}
    </div>
  )
}

interface ColumnMappingRowProps {
  column: LabelledBidColumn
  role: BidColumnRole | null
  takenRoles: ReadonlySet<BidColumnRole>
  disabled: boolean
  onRoleChange: (role: BidColumnRole | null) => void
}

function ColumnMappingRow({
  column,
  role,
  takenRoles,
  disabled,
  onRoleChange,
}: ColumnMappingRowProps): React.JSX.Element {
  const label = column.header === '' ? column.label : column.header
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_15rem] items-center gap-2 text-sm">
      <span className="truncate" title={label}>
        {label}
      </span>
      <ArrowRightIcon aria-hidden="true" className="text-muted-foreground size-4" />
      <ColumnRoleCell
        column={column}
        label={label}
        role={role}
        takenRoles={takenRoles}
        disabled={disabled}
        onRoleChange={onRoleChange}
      />
    </li>
  )
}

function ColumnRoleCell({
  column,
  label,
  role,
  takenRoles,
  disabled,
  onRoleChange,
}: ColumnMappingRowProps & { label: string }): React.JSX.Element {
  if (column.source === 'automatic') {
    return <span className="px-2.5 font-medium">{bidColumnRoleLabel(column.role)}</span>
  }
  const options = BID_COLUMN_ROLES.filter(
    (entry) => entry.role === role || !takenRoles.has(entry.role),
  )
  return (
    <div className="flex items-center gap-1">
      <Select
        value={role ?? ''}
        onValueChange={(value) => onRoleChange(BidColumnRoleSchema.parse(value))}
        disabled={disabled}
      >
        <SelectTrigger className="min-w-0 flex-1" aria-label={`Type of ${label}`}>
          <SelectValue placeholder={UNMAPPED_PLACEHOLDER} />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((entry) => (
            <SelectItem key={entry.role} value={entry.role}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {role !== null && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Clear ${label} mapping`}
          onClick={() => onRoleChange(null)}
          disabled={disabled}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
