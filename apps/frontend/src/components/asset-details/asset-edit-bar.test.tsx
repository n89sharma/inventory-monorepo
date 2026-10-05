import { render, screen } from '@testing-library/react'
import { ASSET_STATUS } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetEditBar } from './asset-edit-bar'

const mocks = vi.hoisted(() => ({
  status: 'IN_STOCK',
  departureNumber: null as string | null,
  granted: new Set<string>(),
}))

vi.mock('@/hooks/use-asset-detail', () => ({
  useAssetDetail: () => ({
    data: {
      assetDetails: {
        id: 1,
        barcode: 'YYZ-0000001',
        status: mocks.status,
        is_in_transit: false,
        departure:
          mocks.departureNumber === null ? null : { departure_number: mocks.departureNumber },
      },
      accessories: [],
    },
  }),
}))
vi.mock('@/hooks/use-can', () => ({
  useCan: (permission?: string) =>
    permission === undefined ? (p: string) => mocks.granted.has(p) : mocks.granted.has(permission),
}))
vi.mock('@/data/store/asset-store', () => ({ useAssetStore: () => vi.fn() }))
vi.mock('@/hooks/use-departure-mutations', () => ({ useDepartureMutations: () => ({}) }))
vi.mock('@/hooks/use-entity-delete', () => ({ useEntityDelete: () => vi.fn() }))
vi.mock('shared-types', async (importOriginal) => ({
  ...(await importOriginal<typeof import('shared-types')>()),
  assetDetailsToSummary: () => ({ id: 1 }),
}))
vi.mock('../shadcn/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))
vi.mock('../shared/share-button', () => ({ ShareButton: () => null }))
vi.mock('../shared/delete-entity-dialog', () => ({ DeleteEntityDialog: () => null }))
vi.mock('../collections/add-to-collection-modal', () => ({ AddToCollectionModal: () => null }))
vi.mock('../departure/return-to-stock-dialog', () => ({ ReturnToStockDialog: () => null }))
vi.mock('./edit-location-modal', () => ({ EditLocationModal: () => null }))
vi.mock('@/components/asset-harvest/harvest-dialogs', () => ({
  HarvestAssetsDialog: () => null,
  ReturnHarvestedToStockDialog: () => null,
}))
vi.mock('@/components/asset-missing/mark-assets-missing-dialog', () => ({
  MarkAssetsMissingDialog: () => null,
}))
vi.mock('@/components/asset-missing/return-missing-to-stock-dialog', () => ({
  ReturnMissingToStockDialog: () => null,
}))

const PERMISSIONS = ['update_location', 'create_update_hold', 'delete_asset', 'update_asset_status']

describe('AssetEditBar', () => {
  beforeEach(() => {
    mocks.granted = new Set(PERMISSIONS)
    mocks.departureNumber = null
  })

  it('an in-stock asset offers location, collection, harvest, missing and delete', () => {
    mocks.status = ASSET_STATUS.IN_STOCK
    render(<AssetEditBar barcode="YYZ-0000001" />)

    expect(screen.getByRole('button', { name: 'Edit location' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Collection/ })).toBeInTheDocument()
    expect(screen.getByText('Mark Harvested')).toBeInTheDocument()
    expect(screen.getByText('Mark Missing')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.queryByText('Return to Stock')).not.toBeInTheDocument()
  })

  it('a missing asset offers only Return to Stock', () => {
    mocks.status = ASSET_STATUS.MISSING
    render(<AssetEditBar barcode="YYZ-0000001" />)

    expect(screen.queryByRole('button', { name: 'Edit location' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Collection/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Mark Harvested')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.getByText('Return to Stock')).toBeInTheDocument()
  })

  it('a missing asset offers no Return to Stock without the permission', () => {
    mocks.status = ASSET_STATUS.MISSING
    mocks.granted = new Set(PERMISSIONS.filter((p) => p !== 'update_asset_status'))
    render(<AssetEditBar barcode="YYZ-0000001" />)

    expect(screen.queryByText('Return to Stock')).not.toBeInTheDocument()
  })

  it('an in-stock asset on a departure that has not loaded it offers neither Return to Stock nor a status mark', () => {
    mocks.status = ASSET_STATUS.IN_STOCK
    mocks.departureNumber = 'D-YYZ-0000001'
    render(<AssetEditBar barcode="YYZ-0000001" />)

    expect(screen.queryByText('Return to Stock')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark Harvested')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark Missing')).not.toBeInTheDocument()
  })

  it('an in-stock asset offers no status mark without the permission', () => {
    mocks.status = ASSET_STATUS.IN_STOCK
    mocks.granted = new Set(PERMISSIONS.filter((p) => p !== 'update_asset_status'))
    render(<AssetEditBar barcode="YYZ-0000001" />)

    expect(screen.queryByText('Mark Harvested')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark Missing')).not.toBeInTheDocument()
  })

  it('a sold asset on a departure offers Return to Stock', () => {
    mocks.status = ASSET_STATUS.SOLD
    mocks.departureNumber = 'D-YYZ-0000001'
    render(<AssetEditBar barcode="YYZ-0000001" />)

    expect(screen.getByText('Return to Stock')).toBeInTheDocument()
  })
})
