import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AssetSearchRow, InvoiceDetail } from 'shared-types'
import { makeAssetSearchRow } from '@/test/asset-factories'
import { InvoiceSummaryStrip } from './invoice-summary-strip'

const NO_COST = {
  cost_purchase_cost: null,
  cost_transport_cost: null,
  cost_processing_cost: null,
  cost_other_cost: null,
  cost_parts_cost: null,
  cost_total_cost: null,
  cost_sale_price: null,
} as const satisfies Partial<AssetSearchRow>

function makeInvoice(assets: AssetSearchRow[]): InvoiceDetail {
  return {
    invoice_number: 'INV-1',
    invoice_reference: 'REF-1',
    invoice_type: { id: 1, type: 'purchase' },
    is_cleared: true,
    notes: null,
    invoice_date: '2026-01-01',
    created_at: new Date('2026-01-01T00:00:00Z'),
    created_by: {
      id: 1,
      name: 'Jane Doe',
      email: null,
      is_active: true,
      role: 'admin',
      clerk_id: null,
      default_warehouse_id: null,
    },
    customer: {
      id: 1,
      account_number: 'AC-1',
      name: 'Acme',
      contact_name: null,
      phone: null,
      mobile: null,
      primary_email: null,
      address: null,
      city: null,
      province: null,
      country: null,
    },
    assets,
    arrivals: [],
  }
}

function renderStrip(
  invoice: InvoiceDetail,
  permissions: { canViewPurchasePrice: boolean; canViewSalePrice: boolean },
) {
  render(
    <MemoryRouter>
      <InvoiceSummaryStrip invoice={invoice} {...permissions} />
    </MemoryRouter>,
  )
}

const ALL_PERMISSIONS = { canViewPurchasePrice: true, canViewSalePrice: true }

describe('InvoiceSummaryStrip cost totals', () => {
  it('sums each cost field across the invoice assets', () => {
    const invoice = makeInvoice([
      makeAssetSearchRow({
        cost_purchase_cost: 100,
        cost_transport_cost: 20,
        cost_total_cost: 125,
        cost_sale_price: 200,
      }),
      makeAssetSearchRow({
        cost_purchase_cost: 250,
        cost_transport_cost: 30,
        cost_total_cost: 300,
        cost_sale_price: 500,
      }),
    ])
    renderStrip(invoice, ALL_PERMISSIONS)

    expect(screen.getByText('Purchase Cost').nextElementSibling).toHaveTextContent('$350.00')
    expect(screen.getByText('Transport Cost').nextElementSibling).toHaveTextContent('$50.00')
    expect(screen.getByText('Total Cost').nextElementSibling).toHaveTextContent('$425.00')
    expect(screen.getByText('Sale Price').nextElementSibling).toHaveTextContent('$700.00')
  })

  it('treats null cost fields as zero', () => {
    const invoice = makeInvoice([
      makeAssetSearchRow({ ...NO_COST, cost_purchase_cost: 100 }),
      makeAssetSearchRow(NO_COST),
      makeAssetSearchRow(NO_COST),
    ])
    renderStrip(invoice, ALL_PERMISSIONS)

    expect(screen.getByText('Purchase Cost').nextElementSibling).toHaveTextContent('$100.00')
    expect(screen.getByText('Sale Price').nextElementSibling).toHaveTextContent('$0.00')
  })

  it('hides purchase totals without view_purchase_price', () => {
    const invoice = makeInvoice([makeAssetSearchRow()])
    renderStrip(invoice, { canViewPurchasePrice: false, canViewSalePrice: true })

    expect(screen.queryByText('Purchase Cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Transport Cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Total Cost')).not.toBeInTheDocument()
    expect(screen.getByText('Sale Price')).toBeInTheDocument()
  })

  it('hides the sale-price total without view_sale_price', () => {
    const invoice = makeInvoice([makeAssetSearchRow()])
    renderStrip(invoice, { canViewPurchasePrice: true, canViewSalePrice: false })

    expect(screen.getByText('Purchase Cost')).toBeInTheDocument()
    expect(screen.queryByText('Sale Price')).not.toBeInTheDocument()
  })
})
