import { Badge } from '@/components/shadcn/badge'
import { formatTitleCase } from '@/lib/formatters'

export function InvoiceTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{formatTitleCase(type)}</Badge>
}
