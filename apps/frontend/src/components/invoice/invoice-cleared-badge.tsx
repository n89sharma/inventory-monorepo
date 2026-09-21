import { Badge } from '@/components/shadcn/badge'

const CLEARED_LABEL = 'Cleared'
const NOT_CLEARED_LABEL = 'Not cleared'

export function InvoiceClearedBadge({ cleared }: { cleared: boolean }) {
  if (cleared) return <Badge variant="success">{CLEARED_LABEL}</Badge>
  return <Badge variant="secondary">{NOT_CLEARED_LABEL}</Badge>
}
