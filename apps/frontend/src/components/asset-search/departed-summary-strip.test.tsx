import { makeAssetSearchRow } from '@/test/asset-factories'
import { render, screen } from '@testing-library/react'
import type { Permission } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DepartedSummaryStrip } from './departed-summary-strip'

const REQUIRED_PERMISSIONS: Permission[] = [
  'view_profitability_report',
  'view_purchase_price',
  'view_sale_price',
]

const mocks = vi.hoisted(() => ({ permissions: [] as Permission[] }))

vi.mock('@/hooks/use-my-permissions', () => ({ useMyPermissions: () => mocks.permissions }))

const PRICED_ASSET = makeAssetSearchRow({ cost_total_cost: 600, cost_sale_price: 1000 })

beforeEach(() => {
  mocks.permissions = REQUIRED_PERMISSIONS
})

describe('DepartedSummaryStrip', () => {
  it('summarises the departed assets for a viewer holding every required permission', () => {
    render(<DepartedSummaryStrip assets={[PRICED_ASSET]} />)

    expect(screen.getByText('Gross Revenue').nextElementSibling).toHaveTextContent('$1,000.00')
    expect(screen.getByText('Gross Margin').nextElementSibling).toHaveTextContent('$400.00')
  })

  // The strip is profitability, so it answers to the profitability permission even for a viewer
  // who may see the underlying prices elsewhere.
  it('renders nothing without view_profitability_report', () => {
    mocks.permissions = ['view_purchase_price', 'view_sale_price']
    const { container } = render(<DepartedSummaryStrip assets={[PRICED_ASSET]} />)

    expect(container).toBeEmptyDOMElement()
  })

  // Those price fields arrive redacted, so every row would read as unpriced and the totals
  // would be a confident zero rather than a refusal.
  it.each(['view_purchase_price', 'view_sale_price'] as const)(
    'renders nothing without %s',
    (withheld) => {
      mocks.permissions = REQUIRED_PERMISSIONS.filter((p) => p !== withheld)
      const { container } = render(<DepartedSummaryStrip assets={[PRICED_ASSET]} />)

      expect(container).toBeEmptyDOMElement()
    },
  )
})
