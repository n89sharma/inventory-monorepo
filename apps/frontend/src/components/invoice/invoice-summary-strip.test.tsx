import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AssetCost, AssetSummary, InvoiceDetail } from 'shared-types'
import { InvoiceSummaryStrip } from './invoice-summary-strip'

function makeCost(overrides: Partial<AssetCost> = {}): AssetCost {
  return {
    purchase_cost: 100,
    transport_cost: 20,
    processing_cost: 5,
    other_cost: 0,
    parts_cost: 0,
    total_cost: 125,
    sale_price: 200,
    ...overrides,
  }
}

function makeAsset(cost: AssetCost | null | undefined): AssetSummary {
  return {
    id: 1,
    barcode: 'BC-1',
    brand: 'CANON',
    model: 'IR-2020',
    asset_type: 'COPIER',
    serial_number: 'SN-1',
    meter_total: 0,
    cassettes: null,
    internal_finisher: null,
    accessories: [],
    weight: 0,
    size: 0,
    status: 'IN_STOCK',
    readiness: 'PP_OK',
    location: null,
    purchase_invoice_number: null,
    sales_invoice_number: null,
    is_in_transit: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    cost,
  }
}

function makeInvoice(assets: AssetSummary[]): InvoiceDetail {
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
      makeAsset(
        makeCost({ purchase_cost: 100, transport_cost: 20, total_cost: 125, sale_price: 200 }),
      ),
      makeAsset(
        makeCost({ purchase_cost: 250, transport_cost: 30, total_cost: 300, sale_price: 500 }),
      ),
    ])
    renderStrip(invoice, ALL_PERMISSIONS)

    expect(screen.getByText('Purchase Cost').nextElementSibling).toHaveTextContent('$350.00')
    expect(screen.getByText('Transport Cost').nextElementSibling).toHaveTextContent('$50.00')
    expect(screen.getByText('Total Cost').nextElementSibling).toHaveTextContent('$425.00')
    expect(screen.getByText('Sale Price').nextElementSibling).toHaveTextContent('$700.00')
  })

  it('treats missing cost objects and null fields as zero', () => {
    const invoice = makeInvoice([
      makeAsset(makeCost({ purchase_cost: 100, sale_price: null })),
      makeAsset(null),
      makeAsset(undefined),
    ])
    renderStrip(invoice, ALL_PERMISSIONS)

    expect(screen.getByText('Purchase Cost').nextElementSibling).toHaveTextContent('$100.00')
    expect(screen.getByText('Sale Price').nextElementSibling).toHaveTextContent('$0.00')
  })

  it('hides purchase totals without view_purchase_price', () => {
    const invoice = makeInvoice([makeAsset(makeCost())])
    renderStrip(invoice, { canViewPurchasePrice: false, canViewSalePrice: true })

    expect(screen.queryByText('Purchase Cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Transport Cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Total Cost')).not.toBeInTheDocument()
    expect(screen.getByText('Sale Price')).toBeInTheDocument()
  })

  it('hides the sale-price total without view_sale_price', () => {
    const invoice = makeInvoice([makeAsset(makeCost())])
    renderStrip(invoice, { canViewPurchasePrice: true, canViewSalePrice: false })

    expect(screen.getByText('Purchase Cost')).toBeInTheDocument()
    expect(screen.queryByText('Sale Price')).not.toBeInTheDocument()
  })
})
