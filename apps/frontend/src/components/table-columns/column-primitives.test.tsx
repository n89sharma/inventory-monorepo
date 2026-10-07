import { DataTable } from '@/components/shared/data-table'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ColumnDef, TableOptions } from '@tanstack/react-table'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

const SEARCH_PLACEHOLDER = 'Search widgets'

type Widget = { id: number; name: string }

const COLUMNS: ColumnDef<Widget, unknown>[] = [
  createSelectColumn<Widget>(),
  { id: 'name', accessorKey: 'name', header: 'Name' },
]

const WIDGETS: Widget[] = ['Anvil', 'Bolt', 'Anchor', 'Clamp', 'Axle'].map((name, id) => ({
  id,
  name,
}))

const WIDGET_TEXT_SEARCH = {
  getColumnCanGlobalFilter: (column) => column.id === 'name',
} as const satisfies Pick<TableOptions<Widget>, 'getColumnCanGlobalFilter'>

const getWidgetId = (widget: Widget) => String(widget.id)

function renderWidgets() {
  render(
    <MemoryRouter>
      <DataTable
        label="Widgets"
        columns={COLUMNS}
        data={WIDGETS}
        getRowId={getWidgetId}
        textSearch={WIDGET_TEXT_SEARCH}
        renderToolbar={(table) => (
          <TableTextFilter table={table} placeholder={SEARCH_PLACEHOLDER} clearLabel="Clear" />
        )}
      />
    </MemoryRouter>,
  )
}

function rowCheckboxes(): HTMLElement[] {
  return screen.getAllByRole('checkbox', { name: 'Select row' })
}

function checkedStates(): boolean[] {
  return rowCheckboxes().map((checkbox) => checkbox.getAttribute('aria-checked') === 'true')
}

function clickRow(index: number, shiftKey = false) {
  const checkbox = rowCheckboxes()[index]
  if (checkbox === undefined) throw new Error(`Expected row ${index}`)
  fireEvent.click(checkbox, { shiftKey })
}

describe('createSelectColumn', () => {
  it('selects a single row on a plain click', () => {
    renderWidgets()
    clickRow(1)
    expect(checkedStates()).toEqual([false, true, false, false, false])
  })

  it('selects every row between the last click and a shift-click', () => {
    renderWidgets()
    clickRow(1)
    clickRow(3, true)
    expect(checkedStates()).toEqual([false, true, true, true, false])
  })

  it('selects the range upwards when the shift-click is above the last click', () => {
    renderWidgets()
    clickRow(3)
    clickRow(0, true)
    expect(checkedStates()).toEqual([true, true, true, true, false])
  })

  it('clears the range when the shift-clicked row was selected', () => {
    renderWidgets()
    clickRow(0)
    clickRow(4, true)
    clickRow(2)
    clickRow(4, true)
    expect(checkedStates()).toEqual([true, true, false, false, false])
  })

  it('treats a shift-click with no earlier click as a plain click', () => {
    renderWidgets()
    clickRow(2, true)
    expect(checkedStates()).toEqual([false, false, true, false, false])
  })

  it('leaves rows hidden by the search out of the range', () => {
    renderWidgets()
    fireEvent.change(screen.getByRole('textbox', { name: SEARCH_PLACEHOLDER }), {
      target: { value: 'an' },
    })
    clickRow(0)
    clickRow(1, true)
    fireEvent.change(screen.getByRole('textbox', { name: SEARCH_PLACEHOLDER }), {
      target: { value: '' },
    })
    expect(checkedStates()).toEqual([true, false, true, false, false])
  })

  it('starts afresh when the last clicked row is no longer shown', () => {
    renderWidgets()
    clickRow(1)
    fireEvent.change(screen.getByRole('textbox', { name: SEARCH_PLACEHOLDER }), {
      target: { value: 'a' },
    })
    clickRow(2, true)
    fireEvent.change(screen.getByRole('textbox', { name: SEARCH_PLACEHOLDER }), {
      target: { value: '' },
    })
    expect(checkedStates()).toEqual([false, true, false, true, false])
  })
})
