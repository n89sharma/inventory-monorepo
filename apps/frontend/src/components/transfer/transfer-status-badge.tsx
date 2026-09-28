import { Badge } from '@/components/shadcn/badge'
import { formatTitleCase } from '@/lib/formatters'
import { TRANSFER_STATUS } from 'shared-types'

const BADGE_VARIANT_BY_STATUS = {
  [TRANSFER_STATUS.DRAFT]: 'secondary',
  [TRANSFER_STATUS.SCHEDULED]: 'secondary',
  [TRANSFER_STATUS.LOADING_IN_PROGRESS]: 'outline',
  [TRANSFER_STATUS.IN_TRANSIT]: 'outline',
  [TRANSFER_STATUS.UNLOADING_IN_PROGRESS]: 'outline',
  [TRANSFER_STATUS.COMPLETE]: 'success',
} as const

export function TransferStatusBadge({ status }: { status: string }) {
  const variant = BADGE_VARIANT_BY_STATUS[status as keyof typeof BADGE_VARIANT_BY_STATUS]
  return <Badge variant={variant ?? 'secondary'}>{formatTitleCase(status)}</Badge>
}
