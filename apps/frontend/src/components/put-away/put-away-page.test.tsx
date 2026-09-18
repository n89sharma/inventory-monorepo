import { useAssetStore } from '@/data/store/asset-store'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AssetLocation, AssetSummary, BulkUpdateAssetLocation, Warehouse } from 'shared-types'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PutAwayPage } from './put-away-page'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mocked at the API rather than at the store, so the barcode lookup is pinned to one seam
// whether the page reaches it through the store or through an SWR hook.
const getAssetByBarcode = vi.hoisted(() => vi.fn())
vi.mock('@/data/api/transfer-api', () => ({ getAssetByBarcode }))

// The scan input offers typeahead suggestions from global search; put-away only ever
// commits the exact code the scanner sent, so the suggestion list stays empty.
vi.mock('@/hooks/use-global-search', () => ({
  ASSET_SEARCH_TYPES: ['assets'],
  useGlobalSearch: () => ({ results: { assets: [] }, isLoading: false }),
}))

const WAREHOUSE: Warehouse = { id: 10, city_code: 'TOR', street: '1 King St', is_active: true }
const OTHER_WAREHOUSE: Warehouse = { id: 20, city_code: 'MTL', street: '2 Rue', is_active: true }

const BIN_A1: AssetLocation = { id: 1, warehouse_id: 10, zone_id: 100, zone: 'BIN', bin: 'A1' }
const BIN_A2: AssetLocation = { id: 2, warehouse_id: 10, zone_id: 100, zone: 'BIN', bin: 'A2' }

vi.mock('@/hooks/use-reference-data', () => ({
  useWarehouses: () => [WAREHOUSE, OTHER_WAREHOUSE],
}))

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ default_warehouse_id: 10 }),
}))

vi.mock('@/hooks/use-locations', () => ({
  useWarehouseLocations: () => ({ data: [BIN_A1, BIN_A2], isLoading: false }),
}))

// The page renders inside StickyPageHeader, which measures itself with a ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const ASSET: AssetSummary = {
  barcode: 'BC-1',
  serial_number: 'SN-1',
  brand: 'CANON',
  model: 'IRADXC3835I',
  is_in_transit: false,
  location: { warehouse_id: 10, warehouse_code: 'TOR', zone: 'BIN', bin: 'B7' },
} as AssetSummary

const SECOND_ASSET: AssetSummary = { ...ASSET, barcode: 'BC-2', serial_number: 'SN-2' }

const REMOTE_ASSET: AssetSummary = {
  ...ASSET,
  location: { warehouse_id: 20, warehouse_code: 'MTL', zone: 'BIN', bin: 'C3' },
} as AssetSummary

const IN_TRANSIT_ASSET: AssetSummary = {
  ...ASSET,
  is_in_transit: true,
  location: null,
} as AssetSummary

const SHELVED_ASSET: AssetSummary = {
  ...ASSET,
  location: { warehouse_id: 10, warehouse_code: 'TOR', zone: 'BIN', bin: 'A1' },
} as AssetSummary

const DEBOUNCE_MS = 500

// A fresh cache per render, no dedupe window and no retry timer, so each test drives the
// lookup exactly as many times as it scans.
const SWR_TEST_OPTIONS = {
  provider: () => new Map(),
  dedupingInterval: 0,
  shouldRetryOnError: false,
  revalidateOnFocus: false,
}

type BulkUpdateAssetLocationFn = (data: BulkUpdateAssetLocation) => Promise<void>

function renderPage() {
  render(
    <SWRConfig value={SWR_TEST_OPTIONS}>
      <PutAwayPage />
    </SWRConfig>,
  )
}

function locationInput(): HTMLElement {
  return screen.getByLabelText('Location')
}

function assetInput(): HTMLElement {
  return screen.getByLabelText('Add asset by barcode or serial number')
}

function scan(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

async function settle(ms = DEBOUNCE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function scanAsset(barcode: string) {
  scan(assetInput(), barcode)
  await act(async () => {
    fireEvent.keyDown(assetInput(), { key: 'Enter' })
  })
}

async function scanLocation(location: string) {
  scan(locationInput(), location)
  await settle()
}

describe('PutAwayPage', () => {
  let bulkUpdateAssetLocation: BulkUpdateAssetLocationFn

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.useFakeTimers()
    getAssetByBarcode.mockReset()
    getAssetByBarcode.mockResolvedValue(ASSET)
    bulkUpdateAssetLocation = vi.fn().mockResolvedValue(undefined)
    useAssetStore.setState({ bulkUpdateAssetLocation })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('the location field', () => {
    it('waits before calling an unrecognised location invalid', async () => {
      renderPage()

      scan(locationInput(), 'zz9')

      expect(screen.queryByText('Location not available')).not.toBeInTheDocument()

      await settle()

      expect(screen.getByText('Location not available')).toBeInTheDocument()
    })

    it('never flags a location that matches a bin', async () => {
      renderPage()

      await scanLocation('a1')

      expect(screen.queryByText('Location not available')).not.toBeInTheDocument()
    })

    it('moves the caret to the asset field once the location matches', async () => {
      renderPage()

      await scanLocation('a1')

      expect(assetInput()).toHaveFocus()
    })

    it('drops the error when the field is emptied', async () => {
      renderPage()

      await scanLocation('zz9')
      expect(screen.getByText('Location not available')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Clear'))
      await settle()

      expect(screen.queryByText('Location not available')).not.toBeInTheDocument()
    })

    it('resolves a location the scanner sends in lower case', async () => {
      renderPage()

      await scanLocation('a1')

      expect(locationInput()).toHaveValue('A1')
    })

    it('accepts an asset scanned before any location', async () => {
      renderPage()

      await scanAsset('bc-1')

      expect(screen.getByText('BC-1')).toBeInTheDocument()
      expect(screen.getByText('1 asset')).toBeInTheDocument()
    })
  })

  describe('the scan list', () => {
    it('adds the scanned asset and clears the asset field, keeping the location', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      expect(screen.getByText('CANON IRADXC3835I')).toBeInTheDocument()
      expect(screen.getByText('BC-1')).toBeInTheDocument()
      expect(assetInput()).toHaveValue('')
      expect(locationInput()).toHaveValue('A1')
    })

    it('collects several assets under one location', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')
      getAssetByBarcode.mockResolvedValue(SECOND_ASSET)
      await scanAsset('bc-2')

      expect(screen.getByText('2 assets')).toBeInTheDocument()
      expect(screen.getByText('BC-1')).toBeInTheDocument()
      expect(screen.getByText('BC-2')).toBeInTheDocument()
    })

    it('refuses the same asset twice', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')
      await scanAsset('bc-1')

      expect(screen.getByText('Asset BC-1 is already in this list.')).toBeInTheDocument()
      expect(screen.getByText('1 asset')).toBeInTheDocument()
    })

    it('refuses an asset that is in transit', async () => {
      getAssetByBarcode.mockResolvedValue(IN_TRANSIT_ASSET)
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      expect(
        screen.getByText('Asset BC-1 is in transit — receive the transfer first.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('1 asset')).not.toBeInTheDocument()
    })

    it('notes an asset that already sits on the scanned shelf', async () => {
      getAssetByBarcode.mockResolvedValue(SHELVED_ASSET)
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      expect(screen.getByText('Already at A1')).toBeInTheDocument()
    })

    it('drops the already-here note when the location moves off that shelf', async () => {
      getAssetByBarcode.mockResolvedValue(SHELVED_ASSET)
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')
      await scanLocation('a2')

      expect(screen.queryByText('Already at A1')).not.toBeInTheDocument()
      expect(screen.getByText('A2')).toBeInTheDocument()
    })

    it('notes a row that the newly scanned location already holds', async () => {
      getAssetByBarcode.mockResolvedValue(SHELVED_ASSET)
      renderPage()

      await scanAsset('bc-1')
      await scanLocation('a1')

      expect(screen.getByText('Already at A1')).toBeInTheDocument()
    })

    it('reports a barcode that does not resolve', async () => {
      getAssetByBarcode.mockRejectedValue(new Error('nope'))
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-9')

      expect(screen.getByText('Asset not found.')).toBeInTheDocument()
    })

    it('drops a row the user removes', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      fireEvent.click(screen.getByLabelText('Remove BC-1'))

      expect(screen.queryByText('BC-1')).not.toBeInTheDocument()
    })

    it('warns when an asset is leaving another warehouse', async () => {
      getAssetByBarcode.mockResolvedValue(REMOTE_ASSET)
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      expect(screen.getByText('Moving out of MTL into TOR')).toBeInTheDocument()
    })

    it('stays quiet when the asset is already in this warehouse', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      expect(screen.queryByText(/Moving out of/)).not.toBeInTheDocument()
    })

    it('keeps the list when the location changes and retargets the rows', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')
      await scanLocation('a2')

      expect(screen.getByText('BC-1')).toBeInTheDocument()
      expect(screen.getByText('A2')).toBeInTheDocument()
    })
  })

  describe('the save', () => {
    it('sends every scanned barcode with the location, then clears the list', async () => {
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')
      getAssetByBarcode.mockResolvedValue(SECOND_ASSET)
      await scanAsset('bc-2')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save 2 assets' }))
      })

      expect(bulkUpdateAssetLocation).toHaveBeenCalledWith({
        warehouse_id: 10,
        zone_id: 100,
        bin: 'A1',
        barcodes: ['BC-2', 'BC-1'],
      })
      expect(screen.queryByText('BC-1')).not.toBeInTheDocument()
      expect(locationInput()).toHaveValue('A1')
    })

    it('keeps the list when the save fails', async () => {
      bulkUpdateAssetLocation = vi.fn().mockRejectedValue(new Error('nope'))
      useAssetStore.setState({ bulkUpdateAssetLocation })
      renderPage()

      await scanLocation('a1')
      await scanAsset('bc-1')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save 1 asset' }))
      })

      expect(screen.getByText('BC-1')).toBeInTheDocument()
    })

    it('offers no save until an asset is scanned', async () => {
      renderPage()

      await scanLocation('a1')

      expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
    })
  })
})
