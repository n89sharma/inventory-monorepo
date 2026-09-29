import { formatDate } from '@/lib/formatters'
import { describe, expect, it } from 'vitest'
import type { DepartureSummary } from 'shared-types'
import { departureTableColumns } from './departure-columns'

type DateColumn = {
  accessorFn: (row: DepartureSummary) => string
  cell: (ctx: { getValue: <T>() => T }) => React.ReactNode
}

function dateColumn(): DateColumn {
  const columns = departureTableColumns(() => '/departures/D-1')
  return columns.find((c) => c.id === 'departure_date') as unknown as DateColumn
}

function dateValue(departure_date: string | null, created_at: Date): string {
  const row = { departure_date, created_at } as DepartureSummary
  return dateColumn().accessorFn(row)
}

function dateText(departure_date: string | null, created_at: Date): React.ReactNode {
  const value = dateValue(departure_date, created_at)
  return dateColumn().cell({ getValue: <T,>() => value as T })
}

describe('departureTableColumns', () => {
  it('sorts and displays departure_date when present', () => {
    expect(dateValue('2026-03-10', new Date(2026, 0, 1))).toBe('2026-03-10')
    expect(dateText('2026-03-10', new Date(2026, 0, 1))).toBe(formatDate(new Date(2026, 2, 10)))
  })

  it('falls back to the created_at day when departure_date is null', () => {
    expect(dateValue(null, new Date(2026, 0, 1, 15, 30))).toBe('2026-01-01')
    expect(dateText(null, new Date(2026, 0, 1, 15, 30))).toBe(formatDate(new Date(2026, 0, 1)))
  })
})
