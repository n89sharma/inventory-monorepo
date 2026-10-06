import { ScheduleDateModal } from '@/components/shared/schedule-date-modal'

interface ScheduleTransferModalProps {
  label: string
  disabled: boolean
  onSchedule: (transferDate: string) => Promise<void>
}

export function ScheduleTransferModal({
  label,
  disabled,
  onSchedule,
}: ScheduleTransferModalProps): React.JSX.Element {
  return (
    <ScheduleDateModal
      title="Schedule this transfer?"
      description="Lock the transfer and queues it for loading"
      dateLabel="Transfer Date"
      triggerLabel={label}
      disabled={disabled}
      onSchedule={onSchedule}
    />
  )
}
