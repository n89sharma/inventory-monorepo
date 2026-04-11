import { Badge } from '@/components/shadcn/badge'
import { formatSentenceCase } from '@/lib/formatters'

function getBadgeClass(status: string): string {
  switch (status) {
    case 'AVAILABLE': return 'bg-lime-300 text-gray-700'
    case 'SOLD': return 'bg-cyan-100 text-gray-700'
    default: return 'bg-rose-300 text-gray-700'
  }
}

export function AvailabilityStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-xs ${getBadgeClass(status)}`}>
      {formatSentenceCase(status)}
    </Badge>
  )
}
