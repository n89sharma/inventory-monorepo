import { Button } from '@/components/shadcn/button'
import { useState } from 'react'
import type { BidRow } from 'shared-types'

export const ZERO_PRICE_LABEL = '$0'

interface ZeroPriceToggleProps {
  row: BidRow
  onToggle: (row: BidRow) => Promise<void>
}

export function ZeroPriceToggle({ row, onToggle }: ZeroPriceToggleProps): React.JSX.Element {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    try {
      await onToggle(row)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={row.zero_priced ? 'default' : 'outline'}
      aria-pressed={row.zero_priced}
      aria-label={`Price row ${row.id} at ${ZERO_PRICE_LABEL}`}
      disabled={saving}
      onClick={toggle}
    >
      {ZERO_PRICE_LABEL}
    </Button>
  )
}
