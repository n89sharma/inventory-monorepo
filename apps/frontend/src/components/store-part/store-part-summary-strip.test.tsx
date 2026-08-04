import { render, screen } from '@testing-library/react'
import type { Permission } from 'shared-types'
import type { StorePartSummary } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorePartSummaryStrip } from './store-part-summary-strip'

const mocks = vi.hoisted(() => ({ granted: new Set<Permission>() }))

vi.mock('@/hooks/use-can', () => ({
  useCan: (permission: Permission) => mocks.granted.has(permission),
}))

const ALL_PERMISSIONS: Permission[] = ['view_store', 'view_purchase_price']

function grant(...permissions: Permission[]) {
  mocks.granted = new Set(permissions)
}

function makeRow(overrides: Partial<StorePartSummary> = {}): StorePartSummary {
  return {
    id: 1,
    part_number: 'PN-1',
    description: 'Fuser',
    warehouse_id: 1,
    warehouse_code: 'YYZ',
    on_hand: 5,
    stock_value: 100,
    last_updated: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function stockValueText() {
  return screen.getByText('Stock Value').nextElementSibling
}

describe('StorePartSummaryStrip', () => {
  beforeEach(() => grant(...ALL_PERMISSIONS))

  it('sums stock value across the rows it is given', () => {
    render(
      <StorePartSummaryStrip
        rows={[makeRow({ stock_value: 100 }), makeRow({ id: 2, stock_value: 250.5 })]}
      />,
    )
    expect(stockValueText()).toHaveTextContent('$350.50')
  })

  it('treats a withheld stock value as zero', () => {
    render(
      <StorePartSummaryStrip
        rows={[makeRow({ stock_value: null }), makeRow({ id: 2, stock_value: 40 })]}
      />,
    )
    expect(stockValueText()).toHaveTextContent('$40.00')
  })

  it('renders a zero total when no rows are in scope', () => {
    render(<StorePartSummaryStrip rows={[]} />)
    expect(stockValueText()).toHaveTextContent('$0.00')
  })

  it('renders nothing without view_purchase_price', () => {
    grant('view_store')
    render(<StorePartSummaryStrip rows={[makeRow()]} />)
    expect(screen.queryByText('Stock Value')).not.toBeInTheDocument()
  })

  it('renders nothing without view_store', () => {
    grant('view_purchase_price')
    render(<StorePartSummaryStrip rows={[makeRow()]} />)
    expect(screen.queryByText('Stock Value')).not.toBeInTheDocument()
  })
})
