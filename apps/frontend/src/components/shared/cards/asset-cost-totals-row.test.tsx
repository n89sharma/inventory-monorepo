import { makeAssetSearchRow } from '@/test/asset-factories'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppRole, AssetSearchRow } from 'shared-types'
import { AssetCostTotalsRow } from './asset-cost-totals-row'

const NO_COST = {
  cost_purchase_cost: null,
  cost_transport_cost: null,
  cost_processing_cost: null,
  cost_other_cost: null,
  cost_parts_cost: null,
  cost_total_cost: null,
  cost_sale_price: null,
} as const satisfies Partial<AssetSearchRow>

const mocks = vi.hoisted(() => ({ role: 'admin' as AppRole }))

vi.mock('@/hooks/use-role', () => ({ useRole: () => mocks.role }))

function totalFor(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? ''
}

beforeEach(() => {
  mocks.role = 'admin'
})

describe('AssetCostTotalsRow', () => {
  it('sums each cost field across the assets', () => {
    render(
      <AssetCostTotalsRow
        assets={[
          makeAssetSearchRow({
            cost_purchase_cost: 100,
            cost_transport_cost: 20,
            cost_processing_cost: 5,
            cost_total_cost: 125,
            cost_sale_price: 200,
          }),
          makeAssetSearchRow({
            cost_purchase_cost: 250,
            cost_transport_cost: 30,
            cost_processing_cost: 20,
            cost_total_cost: 300,
            cost_sale_price: 500,
          }),
        ]}
      />,
    )

    expect(totalFor('Purchase Cost')).toBe('$350.00')
    expect(totalFor('Transport Cost')).toBe('$50.00')
    expect(totalFor('Processing Cost')).toBe('$25.00')
    expect(totalFor('Total Cost')).toBe('$425.00')
    expect(totalFor('Sale Price')).toBe('$700.00')
  })

  // The margin has to reconcile with the Sale Price and Total Cost printed beside it,
  // which is why it is not computed over priced assets only.
  it('derives the margin from the sale price and total cost it prints', () => {
    render(
      <AssetCostTotalsRow
        assets={[
          makeAssetSearchRow({ cost_total_cost: 125, cost_sale_price: 200 }),
          makeAssetSearchRow({ cost_total_cost: 300, cost_sale_price: 500 }),
        ]}
      />,
    )

    expect(totalFor('Gross Margin')).toBe('$275.00')
    expect(totalFor('Margin %')).toBe('39.3%')
  })

  it('keeps the minus outside the dollar sign when the assets sold below cost', () => {
    render(
      <AssetCostTotalsRow
        assets={[makeAssetSearchRow({ cost_total_cost: 500, cost_sale_price: 400 })]}
      />,
    )

    expect(totalFor('Gross Margin')).toBe('-$100.00')
    expect(totalFor('Margin %')).toBe('-25.0%')
  })

  it('reports a flat margin rather than dividing by a zero sale price', () => {
    render(<AssetCostTotalsRow assets={[makeAssetSearchRow({ ...NO_COST })]} />)

    expect(totalFor('Gross Margin')).toBe('$0.00')
    expect(totalFor('Margin %')).toBe('0.0%')
  })

  it('treats null cost fields as zero', () => {
    render(
      <AssetCostTotalsRow
        assets={[
          makeAssetSearchRow({ ...NO_COST, cost_purchase_cost: 100 }),
          makeAssetSearchRow(NO_COST),
          makeAssetSearchRow(NO_COST),
        ]}
      />,
    )

    expect(totalFor('Purchase Cost')).toBe('$100.00')
    expect(totalFor('Sale Price')).toBe('$0.00')
  })

  // The row reads as one profitability statement, so a viewer who may see only half of
  // it sees none of it: sale prices alone would let purchase costs be inferred from any
  // margin, and the line would not add up.
  it('renders nothing for a role holding only view_sale_price', () => {
    mocks.role = 'sales'
    const { container } = render(<AssetCostTotalsRow assets={[makeAssetSearchRow()]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a role with neither price permission', () => {
    mocks.role = 'member'
    const { container } = render(<AssetCostTotalsRow assets={[makeAssetSearchRow()]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
