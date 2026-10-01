import { Checkbox } from '@/components/shadcn/checkbox'
import type { BidRow } from 'shared-types'

export const NO_BID_LABEL = 'No Bid'

interface NoBidToggleProps {
  row: BidRow
  rowNumber: number
  onToggle: (row: BidRow) => Promise<void>
}

export function NoBidToggle({ row, rowNumber, onToggle }: NoBidToggleProps): React.JSX.Element {
  async function toggle() {
    try {
      await onToggle(row)
    } catch {
      // the row has rolled back and the interceptor showed the error toast
    }
  }

  return (
    <Checkbox
      checked={row.zero_priced}
      aria-label={`${NO_BID_LABEL} for row ${rowNumber}`}
      onCheckedChange={toggle}
    />
  )
}
