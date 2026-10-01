import type * as DataTableModule from '@/components/shared/data-table'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { BID_STATUS, type BidDetail } from 'shared-types'
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

vi.mock('@/hooks/use-bid-mutations', () => ({
  useBidMutations: () => ({
    remove: vi.fn(),
    updateMetadata: vi.fn(),
    upload: vi.fn(),
    updateRows: vi.fn(),
    setNoBid: vi.fn(),
    review: vi.fn(),
    returnToDraft: vi.fn(),
    submit: vi.fn(),
    conclude: vi.fn(),
  }),
}))

const detail = vi.hoisted(() => ({ data: undefined as BidDetail | undefined }))

vi.mock('@/hooks/use-bid', () => ({
  useBidDetail: () => ({ data: detail.data, error: undefined, isLoading: !detail.data }),
}))

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
      },
    ],
    totals: { total_cost: 800, expected_sale: 1000, expected_margin: 200, unpriced_count: 0 },
  }
}

function renderPage(status: string) {
  detail.data = makeBid(status)
  render(
    <NuqsTestingAdapter>
      <MemoryRouter initialEntries={[`/bids/${BID_NUMBER}`]}>
        <Routes>
          <Route path="/bids/:collectionId" element={<BidDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </NuqsTestingAdapter>,
  )
}

describe('BidDetailsPage', () => {
  beforeEach(() => {
    detail.data = undefined
  })

  it('lets a draft upload rows and edit prices in the row', () => {
    renderPage(BID_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selling Price for row 1' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'No Bid for row 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Margin % for row 1' })).toHaveTextContent('20%')
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
})
