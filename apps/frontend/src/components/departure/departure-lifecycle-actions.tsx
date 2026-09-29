import { ScheduleDepartureModal } from '@/components/departure/schedule-departure-modal'
import { LifecycleButton } from '@/components/shared/lifecycle-button'
import { useCan } from '@/hooks/use-can'
import { DEPARTURE_STATUS } from 'shared-types'

type DepartureLifecycleActionsProps = {
  status: string
  assetCount: number
  pendingLoadCount: number
  onSchedule: (departureDate: string) => Promise<void>
  onStartLoading: () => Promise<void>
  onFinishLoading: () => Promise<void>
  onComplete: () => Promise<void>
}

export function DepartureLifecycleActions({
  status,
  assetCount,
  pendingLoadCount,
  onSchedule,
  onStartLoading,
  onFinishLoading,
  onComplete,
}: DepartureLifecycleActionsProps): React.JSX.Element | null {
  const canCreateEditDeparture = useCan('create_update_departure')
  if (!canCreateEditDeparture) return null

  if (status === DEPARTURE_STATUS.DRAFT) {
    return <ScheduleDepartureModal onSchedule={onSchedule} />
  }

  if (status === DEPARTURE_STATUS.SCHEDULED) {
    return (
      <LifecycleButton
        label="Start Loading"
        title="Start loading this departure?"
        description="The departure date will be set to today"
        onConfirm={onStartLoading}
      />
    )
  }

  if (status === DEPARTURE_STATUS.LOADING_IN_PROGRESS) {
    const disabled = pendingLoadCount > 0
    const remainingLabel = disabled ? ` (${pendingLoadCount} remaining)` : ''
    return (
      <LifecycleButton
        label={`Finish Loading${remainingLabel}`}
        title="Finish loading this departure?"
        description="Every loaded asset is now sold, scrapped or returned as planned"
        onConfirm={onFinishLoading}
        disabled={disabled}
      />
    )
  }

  if (status === DEPARTURE_STATUS.LOADED) {
    return (
      <LifecycleButton
        label="Complete"
        title="Mark this departure as completed?"
        description={`Confirm the delivery of ${assetCount} asset(s)`}
        onConfirm={onComplete}
      />
    )
  }

  return null
}
