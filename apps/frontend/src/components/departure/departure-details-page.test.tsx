import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  DEPARTURE_STATUS,
  OUTGOING_STATUS,
  type DepartureAssetRow,
  type DepartureDetail,
} from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { makeAssetSearchRow } from '@/test/asset-factories'
import { DepartureDetailsPage } from './departure-details-page'

const DEPARTURE_NUMBER = 'D-YYZ-0000001'

vi.mock('@/hooks/use-can', () => ({ useCan: () => true }))

vi.mock('@/hooks/use-departure-mutations', () => ({
  useDepartureMutations: () => ({
    updatePrice: vi.fn(),
    flushPending: vi.fn(),
    bulkRemoveAssets: vi.fn(),
    addAsset: vi.fn(),
    addAssetBatch: vi.fn(),
    updateMetadata: vi.fn(),
    updateNotes: vi.fn(),
    updateDate: vi.fn(),
    schedule: vi.fn(),
    startLoading: vi.fn(),
    finishLoading: vi.fn(),
    complete: vi.fn(),
    setOutgoingStatus: vi.fn(),
    returnToStock: vi.fn(),
  }),
}))

vi.mock('@/data/api/departure-api', () => ({ getDepartureHistory: vi.fn() }))

const detail = vi.hoisted(() => ({
  data: undefined as DepartureDetail | undefined,
}))

vi.mock('@/hooks/use-departure', () => ({
  departureDetailKey: (n: string) => `departure:${n}`,
  useDepartureDetail: () => ({ data: detail.data, error: undefined, isLoading: !detail.data }),
}))

vi.mock('@/components/collections/collection-detail-page', () => ({
  COLLECTION_DETAILS_TAB: 'details',
  CollectionDetailPage: (props: {
    tabs: { value: string; label: string }[]
    activeTab: string
    renderTabContent: (tabValue: string, entity: unknown) => ReactNode
    renderAddAssetBar: (entity: unknown) => ReactNode
    onBulkRemove?: unknown
    detail: { data: unknown }
  }) => (
    <div data-testid="details-content">
      {props.tabs.map((tab) => (
        <div key={tab.value} data-testid={`tab-${tab.value}`}>
          {tab.label}
        </div>
      ))}
      <div data-testid="active-tab">{props.activeTab}</div>
      {props.onBulkRemove !== undefined && <div data-testid="bulk-remove" />}
      {props.renderAddAssetBar(props.detail.data)}
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

vi.mock('@/components/departure/departure-loading-panel', () => ({
  DepartureLoadingPanel: () => <div data-testid="loading-panel" />,
}))

vi.mock('@/components/collections/add-asset-bar', () => ({
  AddAssetBar: () => <div data-testid="add-asset-bar" />,
}))

function makeAsset(): DepartureAssetRow {
  return {
    ...makeAssetSearchRow({ id: 1, barcode: 'YYZ-0000001' }),
    scan: { loaded: false },
    outgoing_status: OUTGOING_STATUS.SOLD,
  }
}

function makeDetail(status: string): DepartureDetail {
  return {
    departure_number: DEPARTURE_NUMBER,
    status,
    origin: { id: 1, city_code: 'YYZ', street: '1 Main St', is_active: true },
    customer: {
      id: 3,
      account_number: 'C-3',
      name: 'ABM',
      contact_name: null,
      phone: null,
      mobile: null,
      primary_email: null,
      address: null,
      city: null,
      province: null,
      country: null,
    },
    transporter: {
      id: 4,
      account_number: 'T-4',
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
    departure_date: null,
    salesperson: null,
    assets: [makeAsset()],
    invoices: [],
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/departures/${DEPARTURE_NUMBER}`]}>
      <Routes>
        <Route path="/departures/:collectionId" element={<DepartureDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DepartureDetailsPage tabs', () => {
  it('shows no Loading tab while Draft', () => {
    detail.data = makeDetail(DEPARTURE_STATUS.DRAFT)
    renderPage()

    expect(screen.queryByTestId('tab-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('details')
  })

  it('shows the Loading tab, opened by default, when Loading In Progress', () => {
    detail.data = makeDetail(DEPARTURE_STATUS.LOADING_IN_PROGRESS)
    renderPage()

    expect(screen.getByTestId('tab-loading')).toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('loading')
    expect(screen.getByTestId('loading-panel')).toBeInTheDocument()
  })

  it('shows no Loading tab once Loaded', () => {
    detail.data = makeDetail(DEPARTURE_STATUS.LOADED)
    renderPage()

    expect(screen.queryByTestId('tab-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-tab')).toHaveTextContent('details')
  })
})

describe('DepartureDetailsPage edit affordances', () => {
  it('offers adding and removing assets only while Draft', () => {
    detail.data = makeDetail(DEPARTURE_STATUS.DRAFT)
    const { unmount } = renderPage()
    expect(screen.getByTestId('add-asset-bar')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-remove')).toBeInTheDocument()
    unmount()

    for (const status of [
      DEPARTURE_STATUS.SCHEDULED,
      DEPARTURE_STATUS.LOADING_IN_PROGRESS,
      DEPARTURE_STATUS.LOADED,
      DEPARTURE_STATUS.COMPLETE,
    ]) {
      detail.data = makeDetail(status)
      const rendered = renderPage()
      expect(screen.queryByTestId('add-asset-bar')).not.toBeInTheDocument()
      expect(screen.queryByTestId('bulk-remove')).not.toBeInTheDocument()
      rendered.unmount()
    }
  })
})
