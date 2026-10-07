import type * as DataTableModule from '@/components/shared/data-table'
import { TooltipProvider } from '@/components/shadcn/tooltip'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { BID_COLUMN_ROLE, BID_STATUS, type BidDetail, type BidModelStock } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BidDetailsPage } from './bid-details-page'

const BID_NUMBER = 'B-0000001'

vi.mock('@/hooks/use-entity-delete', () => ({ useEntityDelete: () => vi.fn() }))

vi.mock('@/components/shadcn/sidebar', () => ({
  useSidebar: () => ({ state: 'expanded', isMobile: false }),
}))

vi.mock('@/hooks/use-org', () => ({ useOrgs: () => [] }))

vi.mock('@/components/shared/data-table', async (importOriginal) => {
  const actual = await importOriginal<typeof DataTableModule>()
  return { ...actual, DataGridWithoutResultCount: actual.DataTable }
})

const removeRows = vi.hoisted(() => vi.fn())
const updateRows = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-bid-mutations', () => ({
  useBidMutations: () => ({
    removeRows,
    flushPending: vi.fn(),
    remove: vi.fn(),
    updateMetadata: vi.fn(),
    upload: vi.fn(),
    updateRows,
    mapColumns: vi.fn(),
    setNoBid: vi.fn(),
    review: vi.fn(),
    returnToDraft: vi.fn(),
    submit: vi.fn(),
    conclude: vi.fn(),
  }),
}))

const detail = vi.hoisted(() => ({
  data: undefined as BidDetail | undefined,
  modelStock: [] as BidModelStock[],
}))

vi.mock('@/hooks/use-bid', () => ({
  useBidDetail: () => ({ data: detail.data, error: undefined, isLoading: !detail.data }),
  useBidModelStock: () => ({ data: detail.modelStock }),
}))

const MATCHED_MODEL = { id: 7, name: 'IRADX4745I' }
const MATCHED_MODEL_STOCK: BidModelStock = {
  model_id: MATCHED_MODEL.id,
  in_stock_count: 4,
  held_count: 2,
  median_sale_price: 650,
  sales_count: 12,
}

function makeBid(status: string): BidDetail {
  return {
    bid_number: BID_NUMBER,
    status,
    outcome: null,
    received_date: '2026-03-10',
    due_date: '2026-03-20',
    submitted_date: null,
    vendor: { id: 1, account_number: null, name: 'Acme Leasing' },
    notes: null,
    total_cost: 800,
    row_count: 1,
    created_at: new Date('2026-03-10T12:00:00Z'),
    created_by: 'Admin',
    margin_percent: 25,
    transport_cost: 30,
    headers: ['Serial', 'Location'],
    rows: [
      {
        id: 11,
        cells: ['S1', 'Dock 4'],
        selling_price: 1000,
        transport_cost: 100,
        transport_cost_overridden: true,
        margin_percent: 20,
        margin_overridden: true,
        zero_priced: false,
        priced: true,
        bid_price: 700,
        total_cost: 800,
        margin_amount: 200,
        model: null,
      },
    ],
    column_mappings: [],
    totals: { total_cost: 800, expected_sale: 1000, expected_margin: 200, unpriced_count: 0 },
  }
}

function renderPage(status: string, overrides: Partial<BidDetail> = {}) {
  detail.data = { ...makeBid(status), ...overrides }
  render(
    <NuqsTestingAdapter>
      <MemoryRouter initialEntries={[`/bids/${BID_NUMBER}`]}>
        <Routes>
          <Route path="/bids/:collectionId" element={<BidDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </NuqsTestingAdapter>,
    { wrapper: TooltipProvider },
  )
}

describe('BidDetailsPage', () => {
  beforeEach(() => {
    detail.data = undefined
    detail.modelStock = []
  })

  function renderModelBid() {
    const [row] = makeBid(BID_STATUS.DRAFT).rows
    if (row === undefined) throw new Error('Expected a row')
    detail.modelStock = [MATCHED_MODEL_STOCK]
    renderPage(BID_STATUS.DRAFT, {
      headers: ['Model', 'Location'],
      rows: [
        { ...row, cells: ['ir Adv DX 4745i', 'Dock 4'], model: MATCHED_MODEL },
        { ...row, id: 12, cells: ['IP 1135+', 'Dock 5'], model: null },
      ],
    })
  }

  it('lets a draft upload rows and edit prices in the row', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selling Price for row 1' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'No Bid for row 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Margin % for row 1' })).toHaveTextContent('20%')
  })

  it('sets the selling price on the selected rows from the bulk bar', async () => {
    renderPage(BID_STATUS.DRAFT)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set selling price' }))
    fireEvent.change(screen.getByLabelText('Selling Price'), { target: { value: '1250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(updateRows).toHaveBeenCalledWith(BID_NUMBER, { row_ids: [11], selling_price: 1250 }),
    )
  })

  it('removes the selected rows from the bulk bar', () => {
    renderPage(BID_STATUS.DRAFT)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(removeRows).toHaveBeenCalledWith(BID_NUMBER, [11])
  })

  it('offers Map Columns on a draft with rows', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Map Columns' })).toBeInTheDocument()
  })

  it('hides Map Columns on a draft with no rows', () => {
    renderPage(BID_STATUS.DRAFT, { rows: [] })
    expect(screen.queryByRole('button', { name: 'Map Columns' })).not.toBeInTheDocument()
  })

  it('hides Map Columns outside draft', () => {
    renderPage(BID_STATUS.REVIEW)
    expect(screen.queryByRole('button', { name: 'Map Columns' })).not.toBeInTheDocument()
  })

  it('shows a manually mapped column green under its standard name', () => {
    renderPage(BID_STATUS.DRAFT, {
      column_mappings: [{ column_index: 1, role: BID_COLUMN_ROLE.NOTES }],
    })
    expect(screen.getByRole('columnheader', { name: /^Notes/ })).toHaveClass('bg-emerald-100')
  })

  it('shows the Total Meter in thousands', () => {
    const [row] = makeBid(BID_STATUS.DRAFT).rows
    if (row === undefined) throw new Error('Expected a row')
    renderPage(BID_STATUS.DRAFT, {
      headers: ['Serial', 'Total Meter'],
      rows: [{ ...row, cells: ['S1', '191,346'] }],
    })
    expect(screen.getByRole('cell', { name: '191 K' })).toBeInTheDocument()
  })

  it('shows a matched model by its catalogue name in green, with the vendor text on hover', () => {
    renderModelBid()
    const matched = screen.getByText(MATCHED_MODEL.name)
    expect(matched).toHaveClass('text-emerald-700')
    expect(matched).toHaveAttribute('title', 'ir Adv DX 4745i')
  })

  it('shows an unmatched model as the vendor typed it', () => {
    renderModelBid()
    expect(screen.getByRole('cell', { name: 'IP 1135+' })).toBeInTheDocument()
  })

  it('groups the stock and sales columns after the pasted columns, right before Selling Price', () => {
    renderModelBid()
    const labels = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.split('(')[0]?.trim() ?? '')
      .filter((label) => label !== '')
    const sellingAt = labels.indexOf('Selling Price')
    expect(labels.slice(sellingAt - 6, sellingAt)).toEqual([
      'Location',
      'In Stock',
      'Held',
      'Median Sale Price',
      'Sales',
      'Price History',
    ])
  })

  it('colours the stock and sales headers violet', () => {
    renderModelBid()
    expect(screen.getByRole('columnheader', { name: /In Stock/ })).toHaveClass('bg-violet-100')
    expect(screen.getByRole('columnheader', { name: /Price History/ })).toHaveClass('bg-violet-100')
  })

  it('hides and restores the stock and sales columns with the Sales Data switch', () => {
    renderModelBid()
    const salesData = screen.getByRole('switch', { name: 'Sales Data' })
    expect(salesData).toBeChecked()
    fireEvent.click(salesData)
    expect(salesData).not.toBeChecked()
    expect(screen.queryByRole('columnheader', { name: /In Stock/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /Price History/ })).not.toBeInTheDocument()
    fireEvent.click(salesData)
    expect(screen.getByRole('columnheader', { name: /In Stock/ })).toBeInTheDocument()
  })

  it("shows the matched model's figures and leaves an unmatched row blank", () => {
    renderModelBid()
    const [, matchedRow, unmatchedRow] = screen.getAllByRole('row')
    expect(matchedRow).toHaveTextContent('$650.00')
    expect(unmatchedRow).not.toHaveTextContent('$650.00')
  })

  it('shows the sales figures for a newly selected window', () => {
    renderModelBid()
    detail.modelStock = [{ ...MATCHED_MODEL_STOCK, sales_count: 30 }]
    fireEvent.click(screen.getByRole('radio', { name: '12 mo' }))
    const [, matchedRow] = screen.getAllByRole('row')
    if (matchedRow === undefined) throw new Error('Expected the matched row')
    expect(within(matchedRow).getByRole('cell', { name: '30' })).toBeInTheDocument()
  })

  it('fills in the stock figures when they arrive after the rows', () => {
    renderModelBid()
    detail.modelStock = []
    fireEvent.click(screen.getByRole('radio', { name: '12 mo' }))
    detail.modelStock = [MATCHED_MODEL_STOCK]
    fireEvent.click(screen.getByRole('radio', { name: '1 mo' }))
    const [, matchedRow] = screen.getAllByRole('row')
    expect(matchedRow).toHaveTextContent('$650.00')
  })

  it('links a matched row to its price history at the selected window', () => {
    renderModelBid()
    expect(
      screen.getByRole('link', { name: `Price history for ${MATCHED_MODEL.name}` }),
    ).toHaveAttribute('href', expect.stringContaining(`model=${MATCHED_MODEL.id}`))
    expect(screen.getAllByRole('link', { name: /Price history for/ })).toHaveLength(1)
  })

  it('shows the sales window toggle', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.getByRole('radio', { name: '12 mo' })).toBeInTheDocument()
  })

  it('locks the rows once the bid is in review', () => {
    renderPage(BID_STATUS.REVIEW)
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Selling Price for row 1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '$1,000.00' })).toBeInTheDocument()
  })

  it('shows the row margin in dollars', () => {
    renderPage(BID_STATUS.REVIEW)
    expect(screen.getByRole('columnheader', { name: /^Margin$/ })).toBeInTheDocument()
    expect(screen.getAllByRole('cell', { name: '$200.00' })).toHaveLength(1)
  })

  it('orders the pricing columns Selling Price, Freight, Margin %, Margin, Bid Price, No Bid', () => {
    renderPage(BID_STATUS.DRAFT)
    const labels = screen
      .getAllByRole('columnheader')
      .slice(-6)
      .map((header) => header.textContent ?? '')
    expect(labels.map((label) => label.split('(')[0]?.trim())).toEqual([
      'Selling Price',
      'Freight',
      'Margin %',
      'Margin',
      'Bid Price',
      'No Bid',
    ])
  })

  it('puts the pricing columns after every pasted column', () => {
    renderPage(BID_STATUS.DRAFT)
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent ?? '')
    expect(headers.findIndex((text) => text.includes('Location'))).toBeLessThan(
      headers.findIndex((text) => text.includes('Selling Price')),
    )
  })

  it('colours recognised headers green and unrecognised ones grey', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.getByRole('columnheader', { name: /Serial #/ })).toHaveClass('bg-emerald-100')
    expect(screen.getByRole('columnheader', { name: /Location/ })).toHaveClass('bg-zinc-200')
  })

  it('shows the totals from the server', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.getByText('Expected Margin').parentElement).toHaveTextContent('$200.00')
  })

  it('warns beside the status while rows are unpriced and keeps the Review label plain', () => {
    const totals = { total_cost: 0, expected_sale: 0, expected_margin: 0, unpriced_count: 8 }
    renderPage(BID_STATUS.DRAFT, { totals })
    expect(screen.getByText('8 unpriced')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })

  it('warns when a draft has no rows', () => {
    renderPage(BID_STATUS.DRAFT, { rows: [] })
    expect(screen.getByText('No rows')).toBeInTheDocument()
  })

  it('shows no warning on a fully priced draft', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.queryByText(/unpriced|No rows/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
  })
})
