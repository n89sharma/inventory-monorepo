import { render } from '@testing-library/react'
import type { TableMeta } from '@tanstack/react-table'
import type { AssetSummary } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { InvoiceDetailsPage } from './invoice-details-page'

const INVOICE_NUMBER = 'INV-1'
const BARCODE = 'BC-1'

interface CapturedProps {
  tableMeta?: TableMeta<AssetSummary>
}

const mocks = vi.hoisted(() => {
  const updatePrice = vi.fn().mockResolvedValue(undefined)
  return {
    updatePrice,
    // A stable identity, because the page memoizes its table meta on the mutations object.
    mutations: {
      updatePrice,
      addAsset: vi.fn(),
      updateMetadata: vi.fn(),
      removeAsset: vi.fn(),
      bulkRemoveAssets: vi.fn(),
      flushPending: vi.fn(),
    },
    captured: { current: null as CapturedProps | null },
  }
})

vi.mock('@/components/collections/collection-detail-page', () => ({
  CollectionDetailPage: (props: CapturedProps) => {
    mocks.captured.current = props
    return null
  },
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ collectionId: INVOICE_NUMBER }),
}))

vi.mock('@/hooks/use-can', () => ({ useCan: () => true }))

vi.mock('@/hooks/use-invoice', () => ({
  invoiceDetailKey: (invoiceNumber: string) => `invoice-detail:${invoiceNumber}`,
  useInvoiceDetail: () => ({ data: undefined, error: undefined, isLoading: false }),
}))

vi.mock('@/hooks/use-invoice-mutations', () => ({
  useInvoiceMutations: () => mocks.mutations,
}))

// Guards the wiring the cell cannot check for itself: TableMeta members are optional, so a
// page that fails to supply savePriceField would leave every edit silently unsaved.
describe('InvoiceDetailsPage table meta', () => {
  it('supplies a save callback that patches the price through the invoice mutations', async () => {
    render(<InvoiceDetailsPage />)

    const savePriceField = mocks.captured.current?.tableMeta?.savePriceField
    expect(savePriceField).toBeDefined()

    await savePriceField?.(BARCODE, 'purchase_cost', 150)

    expect(mocks.updatePrice).toHaveBeenCalledWith(INVOICE_NUMBER, BARCODE, {
      purchase_cost: 150,
    })
  })
})
