import { describe, expect, it, vi } from 'vitest'
import { createBrandTableColumns } from './brand-table-columns'
import { createModelTableColumns } from './model-table-columns'
import { createOrgTableColumns } from './org-table-columns'

const EDIT_COLUMN_ID = 'edit'

function columnIds(columns: { id?: string }[]): (string | undefined)[] {
  return columns.map((column) => column.id)
}

describe('settings table columns', () => {
  it('omits the Edit column when no edit callback is supplied', () => {
    expect(columnIds(createBrandTableColumns(undefined))).not.toContain(EDIT_COLUMN_ID)
    expect(columnIds(createModelTableColumns(undefined))).not.toContain(EDIT_COLUMN_ID)
    expect(columnIds(createOrgTableColumns(undefined))).not.toContain(EDIT_COLUMN_ID)
  })

  it('appends the Edit column when an edit callback is supplied', () => {
    expect(columnIds(createBrandTableColumns(vi.fn()))).toContain(EDIT_COLUMN_ID)
    expect(columnIds(createModelTableColumns(vi.fn()))).toContain(EDIT_COLUMN_ID)
    expect(columnIds(createOrgTableColumns(vi.fn()))).toContain(EDIT_COLUMN_ID)
  })

  it('lists the organization columns the settings grid shows', () => {
    const keys = createOrgTableColumns(undefined).map(
      (column) => (column as { accessorKey?: string }).accessorKey,
    )

    expect(keys).toEqual([
      'account_number',
      'name',
      'mobile',
      'primary_email',
      'address',
      'city',
      'country',
    ])
  })
})
