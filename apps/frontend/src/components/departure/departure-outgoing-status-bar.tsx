import type { OutgoingStatus } from 'shared-types'
import { BulkActionBar } from '../collections/bulk-action-bar'
import { DepartureOutgoingStatusToggle } from './departure-outgoing-status-toggle'

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
  return (
    <BulkActionBar
      selectedCount={selectedCount}
      totalCount={totalCount}
      onSelectAll={onSelectAll}
      onClear={onClear}
    >
      <DepartureOutgoingStatusToggle onApply={onApply} />
    </BulkActionBar>
  )
}
