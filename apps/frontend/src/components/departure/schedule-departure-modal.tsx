import { ScheduleDateModal } from '@/components/shared/schedule-date-modal'

interface ScheduleDepartureModalProps {
  disabled?: boolean
  onSchedule: (departureDate: string) => Promise<void>
}

export function ScheduleDepartureModal({
  disabled,
  onSchedule,
}: ScheduleDepartureModalProps): React.JSX.Element {
  return (
    <ScheduleDateModal
      title="Schedule this departure?"
      description="Lock the departure and queue it for loading"
      dateLabel="Departure Date"
      disabled={disabled}
      onSchedule={onSchedule}
    />
  )
}
