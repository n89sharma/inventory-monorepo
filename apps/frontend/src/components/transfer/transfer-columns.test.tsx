import { formatDate } from '@/lib/formatters'
import { describe, expect, it } from 'vitest'
import type { TransferSummary } from 'shared-types'
import { transferTableColumns } from './transfer-columns'

type DateColumn = {
  accessorFn: (row: TransferSummary) => string
  cell: (ctx: { getValue: <T>() => T }) => React.ReactNode
}

function dateColumn(): DateColumn {
  const columns = transferTableColumns(() => '/transfers/T-1')
  return columns.find((c) => c.id === 'transfer_date') as unknown as DateColumn
}

function dateValue(transfer_date: string | null, created_at: Date): string {
  const row = { transfer_date, created_at } as TransferSummary
  return dateColumn().accessorFn(row)
}

function dateText(transfer_date: string | null, created_at: Date): React.ReactNode {
  const value = dateValue(transfer_date, created_at)
  return dateColumn().cell({ getValue: <T,>() => value as T })
}

describe('transferTableColumns', () => {
  it('sorts and displays transfer_date when present', () => {
    expect(dateValue('2026-03-10', new Date(2026, 0, 1))).toBe('2026-03-10')
    expect(dateText('2026-03-10', new Date(2026, 0, 1))).toBe(formatDate(new Date(2026, 2, 10)))
  })

  it('falls back to the created_at day when transfer_date is null', () => {
    expect(dateValue(null, new Date(2026, 0, 1, 15, 30))).toBe('2026-01-01')
    expect(dateText(null, new Date(2026, 0, 1, 15, 30))).toBe(formatDate(new Date(2026, 0, 1)))
  })
})
