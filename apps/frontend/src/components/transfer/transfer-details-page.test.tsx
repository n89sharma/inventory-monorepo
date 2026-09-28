import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TRANSFER_STATUS, type TransferAssetRow, type TransferDetail } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { TransferDetailsPage } from './transfer-details-page'

const TRANSFER_NUMBER = 'T-YYZ-0000001'

vi.mock('@/hooks/use-can', () => ({ useCan: () => true }))

vi.mock('@/hooks/use-entity-delete', () => ({ useEntityDelete: () => vi.fn() }))

vi.mock('@/hooks/use-transfer-mutations', () => ({
  useTransferMutations: () => ({
    updatePrice: vi.fn(),
    remove: vi.fn(),
    flushPending: vi.fn(),
    bulkRemoveAssets: vi.fn(),
    addAsset: vi.fn(),
    addAssetBatch: vi.fn(),
    updateMetadata: vi.fn(),
    updateNotes: vi.fn(),
    schedule: vi.fn(),
    startLoading: vi.fn(),
    depart: vi.fn(),
    startUnloading: vi.fn(),
    complete: vi.fn(),
    returnToOrigin: vi.fn(),
  }),
}))

vi.mock('@/data/api/transfer-api', () => ({ getTransferHistory: vi.fn() }))

const detail = vi.hoisted(() => ({
  data: undefined as TransferDetail | undefined,
}))

vi.mock('@/hooks/use-transfer', () => ({
  transferDetailKey: (n: string) => `transfer:${n}`,
  useTransferDetail: () => ({ data: detail.data, error: undefined, isLoading: !detail.data }),
}))

vi.mock('@/components/collections/collection-detail-page', () => ({
  COLLECTION_DETAILS_TAB: 'details',
  CollectionDetailPage: (props: {
    tabs: { value: string; label: string }[]
    activeTab: string
    renderTabContent: (tabValue: string, entity: unknown) => ReactNode
    detail: { data: unknown }
  }) => (
    <div data-testid="details-content">
      <div data-testid="tab-details">Details</div>
      {props.tabs.map((tab) => (
        <div key={tab.value} data-testid={`tab-${tab.value}`}>
          {tab.label}
        </div>
      ))}
      <div data-testid="active-tab">{props.activeTab}</div>
      {props.tabs
        .filter((tab) => tab.value === props.activeTab)
        .map((tab) => (
          <div key={tab.value} data-testid="tab-content">
            {props.renderTabContent(tab.value, props.detail.data)}
          </div>
        ))}
    </div>
  ),
}))

vi.mock('@/components/transfer/transfer-loading-panel', () => ({
  TransferLoadingPanel: () => <div data-testid="loading-panel" />,
}))

vi.mock('@/components/transfer/transfer-unloading-panel', () => ({
  TransferUnloadingPanel: () => <div data-testid="unloading-panel" />,
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
    status: 'IN_STOCK',
    scan: { loaded: false, unloaded: false },
    ...overrides,
  }
}

function makeDetail(status: string): TransferDetail {
  return {
    transfer_number: TRANSFER_NUMBER,
    status,
    origin: { id: 1, city_code: 'YYZ', street: '1 Main St', is_active: true },
    destination: { id: 2, city_code: 'YUL', street: '2 Main St', is_active: true },
    transporter: {
      id: 3,
      account_number: 'T-3',
      name: 'FAST FREIGHT',
      contact_name: null,
      phone: null,
      mobile: null,
      primary_email: null,
      address: null,
      city: null,
      province: null,
      country: null,
    },
    notes: null,
    created_at: new Date('2026-01-01'),
    created_by: 'Test User',
    assets: [makeAsset({})],
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/transfers/${TRANSFER_NUMBER}`]}>
      <Routes>
        <Route path="/transfers/:collectionId" element={<TransferDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TransferDetailsPage tabs', () => {
  it('shows only Details while Draft', () => {
    detail.data = makeDetail(TRANSFER_STATUS.DRAFT)
    renderPage()

    expect(screen.queryByTestId('tab-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tab-unloading')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('details')
  })

  it('shows the Loading tab, opened by default, when Loading In Progress', () => {
    detail.data = makeDetail(TRANSFER_STATUS.LOADING_IN_PROGRESS)
    renderPage()

    expect(screen.getByTestId('tab-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-unloading')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('loading')
    expect(screen.getByTestId('loading-panel')).toBeInTheDocument()
  })

  it('shows the Unloading tab, opened by default, when Unloading In Progress', () => {
    detail.data = makeDetail(TRANSFER_STATUS.UNLOADING_IN_PROGRESS)
    renderPage()

    expect(screen.getByTestId('tab-unloading')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('unloading')
    expect(screen.getByTestId('unloading-panel')).toBeInTheDocument()
  })

  it('shows only Details when Complete', () => {
    detail.data = makeDetail(TRANSFER_STATUS.COMPLETE)
    renderPage()

    expect(screen.queryByTestId('tab-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tab-unloading')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('details')
  })

  it('auto-switches to the Loading tab when the status transitions into Loading In Progress', () => {
    detail.data = makeDetail(TRANSFER_STATUS.DRAFT)
    const { rerender } = renderPage()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('details')

    detail.data = makeDetail(TRANSFER_STATUS.LOADING_IN_PROGRESS)
    rerender(
      <MemoryRouter initialEntries={[`/transfers/${TRANSFER_NUMBER}`]}>
        <Routes>
          <Route path="/transfers/:collectionId" element={<TransferDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('active-tab')).toHaveTextContent('loading')
  })
})
