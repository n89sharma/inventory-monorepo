import { toColumnDefs, type SummaryColumn } from '@/components/table-columns/summary-column'
import { describe, expect, it } from 'vitest'

type Row = { name: string; start_date: string | null }

const NO_CONTEXT = {}

const PLAIN_COLUMN: SummaryColumn<Row, typeof NO_CONTEXT> = {
  id: 'name',
  label: 'Name',
  text: (row) => row.name,
  sortable: true,
}

const CUSTOM_SORT_COLUMN: SummaryColumn<Row, typeof NO_CONTEXT> = {
  id: 'start_date',
  label: 'Start Date',
  text: (row) => row.start_date ?? '',
  sortable: true,
  sortingFn: () => 0,
  filterFn: 'includesString',
}

describe('toColumnDefs', () => {
  // TanStack merges `{...defaultColumn, ...columnDef}`, so a present-but-undefined
  // sortingFn overrides its own 'auto' default and leaves the column unsortable.
  it('omits sortingFn and filterFn entirely when the column does not set them', () => {
    const [columnDef] = toColumnDefs([PLAIN_COLUMN], NO_CONTEXT)

    expect(columnDef).not.toHaveProperty('sortingFn')
    expect(columnDef).not.toHaveProperty('filterFn')
  })

  it('passes sortingFn and filterFn through when the column sets them', () => {
    const [columnDef] = toColumnDefs([CUSTOM_SORT_COLUMN], NO_CONTEXT)

    expect(columnDef).toHaveProperty('sortingFn', CUSTOM_SORT_COLUMN.sortingFn)
    expect(columnDef).toHaveProperty('filterFn', 'includesString')
  })
})
