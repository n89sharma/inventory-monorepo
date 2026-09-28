import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ASSET_STATUS, type AssetSummary } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { BulkEditBar } from './bulk-edit-bar'

vi.mock('@/hooks/use-can', () => ({ useCan: () => true }))
vi.mock('./bulk-action-bar', () => ({
  BulkActionBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('./add-to-collection-modal', () => ({ AddToCollectionModal: () => null }))
vi.mock('./bulk-edit-pricing-modal', () => ({ BulkEditPricingModal: () => null }))

function makeAsset(id: number, status: string): AssetSummary {
  return { id, barcode: `YYZ-000000${id}`, status } as AssetSummary
}

function renderBar(selectedAssets: AssetSummary[]) {
  render(
    <MemoryRouter>
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => {}}
        onPriceSaveSuccess={() => {}}
      />
    </MemoryRouter>,
  )
}

describe('BulkEditBar', () => {
  it('offers Add to and Edit prices for a selection of in-stock assets', () => {
    renderBar([makeAsset(1, ASSET_STATUS.IN_STOCK), makeAsset(2, ASSET_STATUS.IN_STOCK)])

    expect(screen.getByRole('button', { name: /Add to/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit prices' })).toBeInTheDocument()
  })

  it('hides Add to and Edit prices when the selection includes a missing asset', () => {
    renderBar([makeAsset(1, ASSET_STATUS.IN_STOCK), makeAsset(2, ASSET_STATUS.MISSING)])

    expect(screen.queryByRole('button', { name: /Add to/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit prices' })).not.toBeInTheDocument()
  })
})
