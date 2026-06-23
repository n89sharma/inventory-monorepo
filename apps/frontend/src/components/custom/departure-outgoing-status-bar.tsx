import { OUTGOING_STATUS_LABELS, OutgoingStatusSchema, type OutgoingStatus } from 'shared-types'
import { ToggleGroup, ToggleGroupItem } from '../shadcn/toggle-group'
import { BulkActionBar } from './bulk-action-bar'

const OUTGOING_STATUS_OPTIONS = OutgoingStatusSchema.options

type DepartureOutgoingStatusBarProps = {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
  onApply: (status: OutgoingStatus) => void
}

export function DepartureOutgoingStatusBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onApply,
}: DepartureOutgoingStatusBarProps): React.ReactNode {
  function handleValueChange(next: string) {
    const picked = OUTGOING_STATUS_OPTIONS.find(o => o === next)
    if (picked) onApply(picked)
  }

  return (
    <BulkActionBar
      selectedCount={selectedCount}
      totalCount={totalCount}
      onSelectAll={onSelectAll}
      onClear={onClear}
    >
      <span className="ml-2 text-muted-foreground">Outgoing Status</span>
      <ToggleGroup
        type="single"
        value=""
        onValueChange={handleValueChange}
        variant="outline"
        size="sm"
      >
        {OUTGOING_STATUS_OPTIONS.map(opt => (
          <ToggleGroupItem key={opt} value={opt}>
            {OUTGOING_STATUS_LABELS[opt]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </BulkActionBar>
  )
}
