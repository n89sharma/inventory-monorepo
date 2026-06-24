import { OUTGOING_STATUS_LABELS, OutgoingStatusSchema, type OutgoingStatus } from 'shared-types'
import { ToggleGroup, ToggleGroupItem } from '../shadcn/toggle-group'

const OUTGOING_STATUS_OPTIONS = OutgoingStatusSchema.options

type DepartureOutgoingStatusToggleProps = {
  onApply: (status: OutgoingStatus) => void
}

export function DepartureOutgoingStatusToggle({
  onApply,
}: DepartureOutgoingStatusToggleProps): React.ReactNode {
  function handleValueChange(next: string) {
    const picked = OUTGOING_STATUS_OPTIONS.find(o => o === next)
    if (picked) onApply(picked)
  }

  return (
    <>
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
    </>
  )
}
