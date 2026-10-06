import { ScheduleDateModal } from '@/components/shared/schedule-date-modal'

interface ScheduleDepartureModalProps {
  label: string
  disabled: boolean
  onSchedule: (departureDate: string) => Promise<void>
}

export function ScheduleDepartureModal({
  label,
  disabled,
  onSchedule,
}: ScheduleDepartureModalProps): React.JSX.Element {
  return (
    <ScheduleDateModal
      title="Schedule this departure?"
      description="Lock the departure and queue it for loading"
      dateLabel="Departure Date"
      triggerLabel={label}
      disabled={disabled}
      onSchedule={onSchedule}
    />
  )
}
