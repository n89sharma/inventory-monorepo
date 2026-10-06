import { Badge } from '@/components/shadcn/badge'
import { formatTitleCase } from '@/lib/formatters'
import { WarningIcon } from '@phosphor-icons/react'
import { BID_OUTCOME, BID_STATUS } from 'shared-types'

const BADGE_VARIANT_BY_STATUS = {
  [BID_STATUS.DRAFT]: 'secondary',
  [BID_STATUS.REVIEW]: 'outline',
  [BID_STATUS.SUBMITTED]: 'outline',
  [BID_STATUS.CONCLUDED]: 'success',
} as const

const BADGE_VARIANT_BY_OUTCOME = {
  [BID_OUTCOME.WON]: 'success',
  [BID_OUTCOME.LOST]: 'destructive',
} as const

export function BidStatusBadge({ status }: { status: string }) {
  const variant = BADGE_VARIANT_BY_STATUS[status as keyof typeof BADGE_VARIANT_BY_STATUS]
  return <Badge variant={variant ?? 'secondary'}>{formatTitleCase(status)}</Badge>
}

export function BidOutcomeBadge({ outcome }: { outcome: string }) {
  const variant = BADGE_VARIANT_BY_OUTCOME[outcome as keyof typeof BADGE_VARIANT_BY_OUTCOME]
  return <Badge variant={variant ?? 'secondary'}>{formatTitleCase(outcome)}</Badge>
}

export function BidWarningBadge({ label }: { label: string }) {
  return (
    <Badge variant="warning">
      <WarningIcon aria-hidden="true" />
      {label}
    </Badge>
  )
}
