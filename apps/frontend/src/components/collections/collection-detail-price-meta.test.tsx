import { ArrivalDetailsPage } from '@/components/arrivals/arrival-details-page'
import { DepartureDetailsPage } from '@/components/departure/departure-details-page'
import { InvoiceDetailsPage } from '@/components/invoice/invoice-details-page'
import { TransferDetailsPage } from '@/components/transfer/transfer-details-page'
import { render } from '@testing-library/react'
import type { TableMeta } from '@tanstack/react-table'
import type { AssetSummary } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const COLLECTION_ID = 'C-1'
const BARCODE = 'BC-1'

interface CapturedProps {
  tableMeta?: TableMeta<AssetSummary>
}

const mocks = vi.hoisted(() => {
  // One stable mutations object per entity, because each page memoizes its table meta on it.
  const makeMutations = () => ({
    updatePrice: vi.fn().mockResolvedValue(undefined),
    addAsset: vi.fn(),
    addAssetBatch: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    getAssetForEdit: vi.fn(),
    updateMetadata: vi.fn(),
    updateNotes: vi.fn(),
    dispatch: vi.fn(),
    receive: vi.fn(),
    setOutgoingStatus: vi.fn(),
    removeAsset: vi.fn(),
    bulkRemoveAssets: vi.fn(),
    moveAssets: vi.fn(),
    flushPending: vi.fn(),
  })
  return {
    arrival: makeMutations(),
    transfer: makeMutations(),
    departure: makeMutations(),
    invoice: makeMutations(),
    captured: { current: null as CapturedProps | null },
  }
})

const EMPTY_DETAIL = { data: undefined, error: undefined, isLoading: false }

vi.mock('@/components/collections/collection-detail-page', () => ({
  CollectionDetailPage: (props: CapturedProps) => {
    mocks.captured.current = props
    return null
  },
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ collectionId: COLLECTION_ID }),
}))

vi.mock('@/hooks/use-can', () => ({ useCan: () => true }))

vi.mock('@/hooks/use-arrival', () => ({
  arrivalDetailKey: (id: string) => `arrival-detail:${id}`,
  useArrivalDetail: () => EMPTY_DETAIL,
}))
vi.mock('@/hooks/use-arrival-mutations', () => ({ useArrivalMutations: () => mocks.arrival }))

vi.mock('@/hooks/use-transfer', () => ({
  transferDetailKey: (id: string) => `transfer-detail:${id}`,
  useTransferDetail: () => EMPTY_DETAIL,
}))
vi.mock('@/hooks/use-transfer-mutations', () => ({ useTransferMutations: () => mocks.transfer }))

vi.mock('@/hooks/use-departure', () => ({
  departureDetailKey: (id: string) => `departure-detail:${id}`,
  useDepartureDetail: () => EMPTY_DETAIL,
}))
vi.mock('@/hooks/use-departure-mutations', () => ({ useDepartureMutations: () => mocks.departure }))

vi.mock('@/hooks/use-invoice', () => ({
  invoiceDetailKey: (id: string) => `invoice-detail:${id}`,
  useInvoiceDetail: () => EMPTY_DETAIL,
}))
vi.mock('@/hooks/use-invoice-mutations', () => ({ useInvoiceMutations: () => mocks.invoice }))

const PRICED_DETAIL_PAGES = [
  ['arrival', ArrivalDetailsPage, mocks.arrival],
  ['transfer', TransferDetailsPage, mocks.transfer],
  ['departure', DepartureDetailsPage, mocks.departure],
  ['invoice', InvoiceDetailsPage, mocks.invoice],
] as const

// Guards the wiring the cell cannot check for itself: TableMeta members are optional, so a
// page that fails to supply savePriceField would leave every edit silently unsaved.
describe('priced detail page table meta', () => {
  beforeEach(() => {
    mocks.captured.current = null
  })

  for (const [entity, DetailsPage, mutations] of PRICED_DETAIL_PAGES) {
    it(`the ${entity} page saves a price field through its own mutations`, async () => {
      render(<DetailsPage />)

      const savePriceField = mocks.captured.current?.tableMeta?.savePriceField
      expect(savePriceField).toBeDefined()

      await savePriceField?.(BARCODE, 'purchase_cost', 150)

      expect(mutations.updatePrice).toHaveBeenCalledWith(COLLECTION_ID, BARCODE, {
        purchase_cost: 150,
      })
    })
  }
})
