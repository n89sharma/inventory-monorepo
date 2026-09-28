import type { CellContext } from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import type { TransferSummary } from 'shared-types'
import { formatDate } from '@/lib/formatters'
import { transferTableColumns } from './transfer-columns'

function dateColumnText(transfer_date: string | null, created_at: Date): string | null {
  const columns = transferTableColumns(() => '/transfers/T-1')
  const column = columns.find((c) => c.id === 'transfer_date')
  const row = { original: { transfer_date, created_at } } as unknown as CellContext<
    TransferSummary,
    unknown
  >['row']
  const cell = column?.cell as (ctx: { row: typeof row }) => React.ReactNode
  return cell({ row }) as string | null
}

describe('transferTableColumns', () => {
  it('reads transfer_date when present', () => {
    expect(dateColumnText('2026-03-10', new Date('2026-01-01'))).toBe(
      formatDate(new Date(2026, 2, 10)),
    )
  })

  it('falls back to created_at when transfer_date is null', () => {
    const result = dateColumnText(null, new Date('2026-01-01'))
    expect(result).not.toBe('-')
  })
})
