import { Badge } from '@/components/shadcn/badge'
import { formatTitleCase } from '@/lib/formatters'
import { TRANSFER_STATUS } from 'shared-types'

function getBadgeClass(status: string): string {
  switch (status) {
    case TRANSFER_STATUS.DRAFT:
      return 'bg-slate-300 text-gray-700'
    case TRANSFER_STATUS.IN_TRANSIT:
      return 'bg-cyan-300 text-gray-700'
    case TRANSFER_STATUS.COMPLETE:
      return 'bg-lime-300 text-gray-700'
    default:
      return 'bg-slate-300 text-gray-700'
  }
}

export function TransferStatusBadge({ status }: { status: string }) {
  return <Badge className={`text-xs ${getBadgeClass(status)}`}>{formatTitleCase(status)}</Badge>
}
