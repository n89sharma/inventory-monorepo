import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AssetSummary, TransferAssetRow } from 'shared-types'
import { ASSET_STATUS } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransferScanSplitView } from './transfer-scan-split-view'

const mocks = vi.hoisted(() => ({ getAssetByBarcode: vi.fn() }))

vi.mock('@/data/store/asset-store', () => ({
  useAssetStore: (
    selector: (state: { getAssetByBarcode: typeof mocks.getAssetByBarcode }) => unknown,
  ) => selector({ getAssetByBarcode: mocks.getAssetByBarcode }),
}))

vi.mock('@/components/shadcn/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock('@/hooks/use-global-search', () => ({
  ASSET_SEARCH_TYPES: ['assets'],
  useGlobalSearch: () => ({
    results: { assets: [], arrivals: [], departures: [], transfers: [], holds: [], invoices: [] },
    isLoading: false,
  }),
}))

const BASE_ASSET = {
  brand: 'CANON',
  asset_type: 'COPIER',
  readiness: 'UNTESTED',
  location: null,
  is_in_transit: false,
  created_at: new Date('2026-01-01'),
  country_of_origin: null,
  manufactured_year: null,
  weight: 0,
  size: 0,
  specs_meter_total: null,
  specs_cassettes: null,
  specs_internal_finisher: null,
  accessories: [],
  errors: [],
  specs_toner_life_c: null,
  specs_toner_life_m: null,
  specs_toner_life_y: null,
  specs_toner_life_k: null,
  cost_purchase_cost: null,
  cost_transport_cost: null,
  cost_transfer_cost: null,
  cost_processing_cost: null,
  cost_other_cost: null,
  cost_parts_cost: null,
  cost_total_cost: null,
  cost_sale_price: null,
  hold_hold_number: null,
  held_by: null,
  hold_created_for: null,
  hold_customer: null,
  hold_created_at: null,
  vendor: null,
  customer: null,
  salesperson: null,
  departure_number: null,
  departed_at: null,
  arrival_number: null,
  arrival_warehouse_code: null,
  arrival_created_at: null,
  purchase_invoice_invoice_number: null,
  purchase_invoice_invoice_reference: null,
  sales_invoice_invoice_number: null,
  sales_invoice_invoice_reference: null,
  latest_comment: null,
  latest_comment_by: null,
  latest_comment_at: null,
  is_damaged: null,
  damage_notes: null,
}

function makeAsset(overrides: Partial<TransferAssetRow>): TransferAssetRow {
  return {
    ...BASE_ASSET,
    id: 1,
    barcode: 'YYZ-0000001',
    model: 'IR-4025',
    serial_number: 'SN-1',
    status: ASSET_STATUS.IN_STOCK,
    scan: { loaded: false, unloaded: false },
    ...overrides,
  }
}

function makeAssetSummary(asset: TransferAssetRow): AssetSummary {
  return {
    id: asset.id,
    barcode: asset.barcode,
    brand: asset.brand,
    model: asset.model,
    asset_type: asset.asset_type,
    serial_number: asset.serial_number,
    meter_total: null,
    cassettes: null,
    internal_finisher: null,
    accessories: [],
    weight: 0,
    size: 0,
    status: asset.status,
    readiness: asset.readiness,
    location: asset.location,
    purchase_invoice_number: null,
    sales_invoice_number: null,
    is_in_transit: asset.is_in_transit,
    created_at: asset.created_at,
  }
}

const PENDING_ASSET = makeAsset({ id: 1, barcode: 'YYZ-0000001', serial_number: 'SN-1' })
const RESOLVED_ASSET = makeAsset({
  id: 2,
  barcode: 'YYZ-0000002',
  serial_number: 'SN-2',
  scan: { loaded: true, unloaded: false },
})
const MISSING_ASSET = makeAsset({
  id: 3,
  barcode: 'YYZ-0000003',
  serial_number: 'SN-3',
  status: ASSET_STATUS.MISSING,
})
const NOT_ON_TRANSFER_ASSET = makeAsset({ id: 4, barcode: 'YYZ-0000004', serial_number: 'SN-4' })

function renderSplitView(pendingAssets: TransferAssetRow[], resolvedAssets: TransferAssetRow[]) {
  const onScan = vi.fn().mockResolvedValue(undefined)
  const onMarkMissing = vi.fn().mockResolvedValue(undefined)
  const onUndo = vi.fn().mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <TransferScanSplitView
        pendingAssets={pendingAssets}
        resolvedAssets={resolvedAssets}
        pendingLabel="Pending"
        resolvedLabel="Loaded"
        actionLabel="Load"
        undoLabel="Unload"
        remainingCount={pendingAssets.length}
        pendingStatusMessage={(remaining) => `Transfer can depart after loading ${remaining}`}
        readyStatusMessage="All assets loaded. Transfer can depart."
        focusKey={0}
        onScan={onScan}
        onMarkMissing={onMarkMissing}
        onUndo={onUndo}
      />
    </MemoryRouter>,
  )
  return { onScan, onMarkMissing, onUndo }
}

function scan(barcode: string) {
  const input = screen.getByRole('combobox', { name: 'Add asset by barcode or serial number' })
  fireEvent.change(input, { target: { value: barcode } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('TransferScanSplitView', () => {
  beforeEach(() => {
    mocks.getAssetByBarcode.mockReset()
  })

  it('renders a pending asset in the left pane only', () => {
    renderSplitView([PENDING_ASSET], [])
    expect(screen.getByText(PENDING_ASSET.barcode)).toBeInTheDocument()
  })

  it('renders a resolved asset in the right pane with the success row treatment', () => {
    renderSplitView([], [RESOLVED_ASSET])
    const cell = screen.getByText(RESOLVED_ASSET.barcode)
    expect(cell.closest('tr')).toHaveClass('data-row-success')
    expect(cell.closest('tr')).toHaveClass('h-7')
  })

  it('renders a Missing asset in the pending pane, tinted amber, with no actions', () => {
    renderSplitView([MISSING_ASSET], [])
    const cell = screen.getByText(MISSING_ASSET.barcode)
    expect(cell.closest('tr')).toHaveClass('data-row-warning')
    expect(cell.closest('tr')).toHaveClass('h-7')
    expect(within(cell.closest('tr')!).queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onScan for a valid, unresolved asset', async () => {
    mocks.getAssetByBarcode.mockResolvedValue(makeAssetSummary(PENDING_ASSET))
    const { onScan } = renderSplitView([PENDING_ASSET], [])

    scan(PENDING_ASSET.barcode)

    await waitFor(() => expect(onScan).toHaveBeenCalledWith(PENDING_ASSET.id))
  })

  it('shows a validation error and does not scan an asset not on this leg', async () => {
    mocks.getAssetByBarcode.mockResolvedValue(makeAssetSummary(NOT_ON_TRANSFER_ASSET))
    const { onScan } = renderSplitView([PENDING_ASSET], [])

    scan(NOT_ON_TRANSFER_ASSET.barcode)

    await waitFor(() =>
      expect(screen.getByText(/not in the scheduled transfer list/)).toBeInTheDocument(),
    )
    expect(onScan).not.toHaveBeenCalled()
  })

  it('shows a validation error and does not scan an already-resolved asset', async () => {
    mocks.getAssetByBarcode.mockResolvedValue(makeAssetSummary(RESOLVED_ASSET))
    const { onScan } = renderSplitView([PENDING_ASSET], [RESOLVED_ASSET])

    scan(RESOLVED_ASSET.barcode)

    await waitFor(() => expect(screen.getByText(/already in this transfer/)).toBeInTheDocument())
    expect(onScan).not.toHaveBeenCalled()
  })

  it('calls onMarkMissing for the confirmed pending asset via the overflow menu', async () => {
    const { onMarkMissing } = renderSplitView([PENDING_ASSET], [])

    fireEvent.click(screen.getByRole('button', { name: 'More options' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mark as missing' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark Missing' }))

    await waitFor(() => expect(onMarkMissing).toHaveBeenCalledWith(PENDING_ASSET.id))
  })

  it('calls onScan directly when the manual action button is clicked', async () => {
    const { onScan } = renderSplitView([PENDING_ASSET], [])

    fireEvent.click(screen.getByRole('button', { name: 'Load' }))

    await waitFor(() => expect(onScan).toHaveBeenCalledWith(PENDING_ASSET.id))
  })

  it('calls onUndo for a resolved, non-missing asset after confirming', async () => {
    const { onUndo } = renderSplitView([], [RESOLVED_ASSET])

    fireEvent.click(screen.getByRole('button', { name: 'Unload' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unload' }))

    await waitFor(() => expect(onUndo).toHaveBeenCalledWith(RESOLVED_ASSET.id))
  })

  it('renders a search box for both the pending and resolved panes', () => {
    renderSplitView([PENDING_ASSET], [RESOLVED_ASSET])

    expect(screen.getAllByPlaceholderText('Search barcode, serial, model')).toHaveLength(2)
  })

  it('shows the pending status message with a spinner while assets remain', () => {
    renderSplitView([PENDING_ASSET], [])

    expect(screen.getByText('Transfer can depart after loading 1')).toBeInTheDocument()
  })

  it('shows the ready status message with a checkmark once nothing remains', () => {
    renderSplitView([], [RESOLVED_ASSET])

    expect(screen.getByText('All assets loaded. Transfer can depart.')).toBeInTheDocument()
  })
})
