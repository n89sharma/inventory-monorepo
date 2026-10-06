import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ASSET_STATUS, type AssetSummary } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { BulkEditBar } from './bulk-edit-bar'

const CREATED_TRANSFER_NUMBER = 'T-YYZ-0000001'

vi.mock('@/hooks/use-can', () => ({ useCan: () => true }))
vi.mock('./bulk-action-bar', () => ({
  BulkActionBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('./add-to-collection-modal', () => ({ AddToCollectionModal: () => null }))
vi.mock('./bulk-edit-pricing-modal', () => ({ BulkEditPricingModal: () => null }))

// The Radix menu needs pointer capture that jsdom lacks; render its items as bare
// elements so the test exercises the create wiring rather than the popover mechanics.
vi.mock('@/components/shadcn/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode
    onSelect: () => void
  }) => (
    <div role="menuitem" onClick={onSelect}>
      {children}
    </div>
  ),
}))

vi.mock('../transfer/create-transfer-modal', () => ({
  CreateTransferModal: ({
    assets,
    onCreated,
  }: {
    assets: AssetSummary[]
    onCreated: (transferNumber: string) => void
  }) => (
    <div role="dialog">
      <span>{assets.map((a) => a.barcode).join(',')}</span>
      <button type="button" onClick={() => onCreated(CREATED_TRANSFER_NUMBER)}>
        Create
      </button>
    </div>
  ),
}))

function makeAsset(id: number): AssetSummary {
  return { id, barcode: `YYZ-000000${id}`, status: ASSET_STATUS.IN_STOCK } as AssetSummary
}

function CurrentPath() {
  return <span data-testid="path">{useLocation().pathname}</span>
}

function renderBar(selectedAssets: AssetSummary[], onClear = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <BulkEditBar selectedAssets={selectedAssets} onClear={onClear} />
              <CurrentPath />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
  return { onClear }
}

describe('BulkEditBar create from selection', () => {
  it('opens the new-transfer dialog in place with the selected assets', () => {
    renderBar([makeAsset(1), makeAsset(2)])

    fireEvent.click(screen.getByRole('menuitem', { name: 'Transfer' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('YYZ-0000001,YYZ-0000002')
    expect(screen.getByTestId('path')).toHaveTextContent('/search')
  })

  it('clears the selection and opens the new transfer once it is created', () => {
    const { onClear } = renderBar([makeAsset(1)])

    fireEvent.click(screen.getByRole('menuitem', { name: 'Transfer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.getByTestId('path')).toHaveTextContent(`/transfers/${CREATED_TRANSFER_NUMBER}`)
  })
})
