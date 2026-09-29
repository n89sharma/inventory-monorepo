import { Badge } from '@/components/shadcn/badge'
import { formatTitleCase } from '@/lib/formatters'
import { DEPARTURE_STATUS } from 'shared-types'

const BADGE_VARIANT_BY_STATUS = {
  [DEPARTURE_STATUS.DRAFT]: 'secondary',
  [DEPARTURE_STATUS.SCHEDULED]: 'secondary',
  [DEPARTURE_STATUS.LOADING_IN_PROGRESS]: 'outline',
  [DEPARTURE_STATUS.LOADED]: 'outline',
  [DEPARTURE_STATUS.COMPLETE]: 'success',
} as const

export function DepartureStatusBadge({ status }: { status: string }) {
  const variant = BADGE_VARIANT_BY_STATUS[status as keyof typeof BADGE_VARIANT_BY_STATUS]
  return <Badge variant={variant ?? 'secondary'}>{formatTitleCase(status)}</Badge>
}
