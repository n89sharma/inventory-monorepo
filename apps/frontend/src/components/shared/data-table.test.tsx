import { DataGrid, DataTable } from '@/components/shared/data-table'
import { render, screen } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

const TABLE_LABEL = 'Widgets'
const SCROLL_REGION = '[data-slot="table-scroll"]'
// Above the grid's initial window, so the two frames disagree about how many rows land in
// the DOM: the grid shows its first window, the in-flow table its first page.
const ROW_COUNT = 250
const GRID_INITIAL_ROWS = 100
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

  it('reports the full result count while holding only its first window in the DOM', () => {
    renderInRouter(<DataGrid label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />)
    expect(screen.getByText(`${ROW_COUNT} results`)).toBeInTheDocument()
    expect(bodyRowCount()).toBe(GRID_INITIAL_ROWS)
  })

  it('replaces the pager rather than rendering one', () => {
    renderInRouter(<DataGrid label={TABLE_LABEL} columns={COLUMNS} data={WIDGETS} />)
    expect(screen.queryByRole('button', { name: 'First page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
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
