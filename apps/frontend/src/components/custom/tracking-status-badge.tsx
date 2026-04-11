import { Badge } from '@/components/shadcn/badge'
import { formatSentenceCase } from '@/lib/formatters'

export function TrackingStatusBadge({ status }: { status: string }) {
  return (
    <Badge className="text-xs bg-white text-gray-800 hover:bg-white border border-gray-200">
      {formatSentenceCase(status)}
    </Badge>
  )
}
