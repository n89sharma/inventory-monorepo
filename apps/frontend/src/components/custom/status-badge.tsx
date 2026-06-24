import { ASSET_STATUS } from 'shared-types'
import { Badge } from '@/components/shadcn/badge'
import { formatTitleCase } from '@/lib/formatters'

// Display-only label for an archived hold; not an asset status (see hold-details-page).
const RELEASED_STATUS = 'RELEASED'

function getBadgeClass(status: string): string {
  switch (status) {
    case ASSET_STATUS.IN_STOCK: return 'bg-lime-300 text-gray-700'
    case ASSET_STATUS.SOLD: return 'bg-cyan-100 text-gray-700'
    case RELEASED_STATUS: return 'bg-gray-300 text-gray-700'
    case ASSET_STATUS.HARVESTED: return 'bg-amber-200 text-gray-700'
    case ASSET_STATUS.SCRAPPED: return 'bg-rose-300 text-gray-700'
    default: return 'bg-rose-300 text-gray-700'
  }
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-xs ${getBadgeClass(status)}`}>
      {formatTitleCase(status)}
    </Badge>
  )
}
