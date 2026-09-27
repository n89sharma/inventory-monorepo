import { DataGrid, DataGridWithoutResultCount, DataTable } from '@/components/shared/data-table'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ColumnDef, TableOptions } from '@tanstack/react-table'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

const TABLE_LABEL = 'Widgets'
const SCROLL_REGION = '[data-slot="table-scroll"]'
// Well above both a page and any window, so the two frames disagree about how many rows
// land in the DOM: the grid keeps a screenful, the in-flow table its first page.
const ROW_COUNT = 250
const IN_FLOW_PAGE_ROWS = 75

type Widget = { id: number; name: string }

const COLUMNS: ColumnDef<Widget, unknown>[] = [{ id: 'name', accessorKey: 'name', header: 'Name' }]

const WIDGETS: Widget[] = Array.from({ length: ROW_COUNT }, (_, index) => ({
  id: index,
  name: `Widget ${index}`,
}))

function renderInRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function scrollRegionOf(container: HTMLElement): HTMLElement {
  const region = container.querySelector(SCROLL_REGION)
  if (!(region instanceof HTMLElement)) throw new Error('Expected a scroll region')
  return region
}

function bodyRowCount(): number {
  return screen.getByRole('table').querySelectorAll('tbody tr').length
}

describe('DataGrid', () => {
  it('names its scroll region and keeps it keyboard reachable', () => {
    const { container } = renderInRouter(
      <DataGrid label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />,
    )
    const region = scrollRegionOf(container)
    expect(region).toHaveAttribute('aria-label', TABLE_LABEL)
    expect(region).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('table', { name: TABLE_LABEL })).toBeInTheDocument()
  })

  it('reports the full result count while holding only a window of rows in the DOM', () => {
    renderInRouter(<DataGrid label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />)
    expect(screen.getByText(`${ROW_COUNT} results`)).toBeInTheDocument()
    // jsdom reports no viewport height, so the virtualiser renders its overscan and no
    // more. The assertion that matters is that it is nowhere near the full result set.
    expect(bodyRowCount()).toBeLessThan(ROW_COUNT)
  })

  it('replaces the pager rather than rendering one', () => {
    renderInRouter(<DataGrid label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />)
    expect(screen.queryByRole('button', { name: 'First page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })
})

describe('DataGridWithoutResultCount', () => {
  it('leaves the result count to the page', () => {
    renderInRouter(
      <DataGridWithoutResultCount label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />,
    )
    expect(screen.queryByText(`${ROW_COUNT} results`)).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: TABLE_LABEL })).toBeInTheDocument()
  })
})

const SEARCH_PLACEHOLDER = 'Barcode, serial or model'
const SEARCH_CLEAR_LABEL = 'Clear search'

type Part = { id: number; barcode: string; serial_number: string; model: string; note: string }

const PART_COLUMNS: ColumnDef<Part, unknown>[] = [
  { id: 'barcode', accessorKey: 'barcode', header: 'Barcode' },
  { id: 'serial_number', accessorKey: 'serial_number', header: 'Serial' },
  { id: 'model', accessorKey: 'model', header: 'Model' },
  { id: 'note', accessorKey: 'note', header: 'Note' },
]

// One row per searchable field carries the query, so a hit on any single field has to be
// enough. The fourth carries it only in a column outside the allow-list.
const PARTS: Part[] = [
  { id: 1, barcode: 'ALPHA-1', serial_number: 'ser-1', model: 'mod-1', note: 'note-1' },
  { id: 2, barcode: 'bar-2', serial_number: 'alpha-2', model: 'mod-2', note: 'note-2' },
  { id: 3, barcode: 'bar-3', serial_number: 'ser-3', model: 'Alpha Model', note: 'note-3' },
  { id: 4, barcode: 'bar-4', serial_number: 'ser-4', model: 'mod-4', note: 'ALPHA note' },
]

const SEARCHABLE_PART_COLUMN_IDS = new Set(['barcode', 'serial_number', 'model'])

const PART_TEXT_SEARCH = {
  getColumnCanGlobalFilter: (column) => SEARCHABLE_PART_COLUMN_IDS.has(column.id),
} as const satisfies Pick<TableOptions<Part>, 'getColumnCanGlobalFilter'>

function renderSearchableParts() {
  return renderInRouter(
    <DataTable
      label={TABLE_LABEL}
      columns={PART_COLUMNS}
      data={PARTS}
      textSearch={PART_TEXT_SEARCH}
      renderToolbar={(table) => (
        <TableTextFilter
          table={table}
          placeholder={SEARCH_PLACEHOLDER}
          clearLabel={SEARCH_CLEAR_LABEL}
        />
      )}
    />,
  )
}

function search(query: string) {
  fireEvent.change(screen.getByRole('textbox', { name: SEARCH_PLACEHOLDER }), {
    target: { value: query },
  })
}

describe('table text search', () => {
  it('keeps a row when any searchable column matches', () => {
    renderSearchableParts()
    search('alpha')
    expect(bodyRowCount()).toBe(3)
    expect(screen.getByText('ALPHA-1')).toBeInTheDocument()
    expect(screen.getByText('alpha-2')).toBeInTheDocument()
    expect(screen.getByText('Alpha Model')).toBeInTheDocument()
  })

  it('ignores columns the caller left out of the search', () => {
    renderSearchableParts()
    search('alpha')
    expect(screen.queryByText('ALPHA note')).not.toBeInTheDocument()
  })

  it('matches case-insensitively and mid-string', () => {
    renderSearchableParts()
    search('ALPHA-2')
    expect(bodyRowCount()).toBe(1)
    expect(screen.getByText('alpha-2')).toBeInTheDocument()

    search('lpha mod')
    expect(bodyRowCount()).toBe(1)
    expect(screen.getByText('Alpha Model')).toBeInTheDocument()
  })

  it('reports an empty result set', () => {
    renderSearchableParts()
    search('no-such-asset')
    expect(screen.getByText('No results.')).toBeInTheDocument()
  })

  it('restores every row when the search is cleared', () => {
    renderSearchableParts()
    search('alpha')
    fireEvent.click(screen.getByRole('button', { name: SEARCH_CLEAR_LABEL }))
    expect(bodyRowCount()).toBe(PARTS.length)
    expect(screen.getByRole('textbox', { name: SEARCH_PLACEHOLDER })).toHaveValue('')
  })

  it('leaves a table that opts out unfiltered', () => {
    renderInRouter(<DataTable label={TABLE_LABEL} columns={PART_COLUMNS} data={PARTS} />)
    expect(bodyRowCount()).toBe(PARTS.length)
    expect(screen.queryByRole('textbox', { name: SEARCH_PLACEHOLDER })).not.toBeInTheDocument()
  })
})

const RESIZE_HANDLE = '[data-slot="column-resize-handle"]'
const DRAG_DISTANCE = 120
// jsdom has no layout, so every measured width is 0 and clamps to the column minimum.
const MIN_COLUMN_WIDTH = 48

type Gadget = { id: number; name: string; note: string }

const RESIZABLE_COLUMNS: ColumnDef<Gadget, unknown>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'note', accessorKey: 'note', header: 'Note' },
  { id: 'edit', header: 'Edit', enableResizing: false },
]

const GADGETS: Gadget[] = [{ id: 1, name: 'Gadget', note: 'Spare' }]

function renderResizableTable() {
  return renderInRouter(
    <DataTable label={TABLE_LABEL} columns={RESIZABLE_COLUMNS} data={GADGETS} />,
  )
}

function headerCell(name: string): HTMLElement {
  const cell = screen.getByRole('columnheader', { name }).closest('th')
  if (!cell) throw new Error(`Expected a header cell named ${name}`)
  return cell
}

function resizeHandleOf(name: string): HTMLElement {
  const handle = headerCell(name).querySelector(RESIZE_HANDLE)
  if (!(handle instanceof HTMLElement)) throw new Error(`Expected a resize handle on ${name}`)
  return handle
}

function headerRowCellCount(): number {
  return screen.getByRole('table').querySelectorAll('thead th').length
}

describe('column resizing', () => {
  it('offers a handle on every column except those that opt out', () => {
    renderResizableTable()
    expect(headerCell('Name').querySelector(RESIZE_HANDLE)).not.toBeNull()
    expect(headerCell('Note').querySelector(RESIZE_HANDLE)).not.toBeNull()
    expect(headerCell('Edit').querySelector(RESIZE_HANDLE)).toBeNull()
  })

  it('opens sized to content, with no filler column', () => {
    renderResizableTable()
    expect(headerCell('Name').style.width).toBe('')
    expect(headerRowCellCount()).toBe(RESIZABLE_COLUMNS.length)
  })

  it('follows the pointer while dragging and adds a filler column once frozen', () => {
    renderResizableTable()
    fireEvent.mouseDown(resizeHandleOf('Name'), { clientX: 0 })
    fireEvent.mouseMove(document, { clientX: DRAG_DISTANCE })
    fireEvent.mouseUp(document, { clientX: DRAG_DISTANCE })
    expect(headerCell('Name').style.width).toBe(`${MIN_COLUMN_WIDTH + DRAG_DISTANCE}px`)
    expect(headerCell('Note').style.width).toBe(`${MIN_COLUMN_WIDTH}px`)
    expect(headerRowCellCount()).toBe(RESIZABLE_COLUMNS.length + 1)
  })

  it('fits a column to its content on double-click', () => {
    renderResizableTable()
    fireEvent.mouseDown(resizeHandleOf('Name'), { clientX: 0 })
    fireEvent.mouseMove(document, { clientX: DRAG_DISTANCE })
    fireEvent.mouseUp(document, { clientX: DRAG_DISTANCE })
    fireEvent.doubleClick(resizeHandleOf('Name'))
    expect(headerCell('Name').style.width).toBe(`${MIN_COLUMN_WIDTH}px`)
  })

  it('never sorts the column it resizes', () => {
    renderResizableTable()
    const handle = resizeHandleOf('Name')
    fireEvent.mouseDown(handle, { clientX: 0 })
    fireEvent.mouseUp(document, { clientX: 0 })
    fireEvent.click(handle)
    expect(headerCell('Name')).not.toHaveAttribute('aria-sort')
  })
})

describe('DataTable', () => {
  it('keeps the pager for a table that sits in flow', () => {
    renderInRouter(<DataTable label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />)
    expect(screen.getByRole('button', { name: 'First page' })).toBeInTheDocument()
    expect(bodyRowCount()).toBe(IN_FLOW_PAGE_ROWS)
  })

  it('leaves the result count to the pager', () => {
    renderInRouter(<DataTable label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />)
    expect(screen.queryByText(`${ROW_COUNT} results`)).not.toBeInTheDocument()
  })
})
