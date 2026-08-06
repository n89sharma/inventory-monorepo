import { useAssetStore } from '@/data/store/asset-store'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AssetLocation, AssetSummary, UpdateAssetLocation, Warehouse } from 'shared-types'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PutAwayPage } from './put-away-page'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mocked at the API rather than at the store, so the barcode lookup is pinned to one seam
// whether the page reaches it through the store or through an SWR hook.
const getAssetByBarcode = vi.hoisted(() => vi.fn())
vi.mock('@/data/api/transfer-api', () => ({ getAssetByBarcode }))

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
  location: { warehouse_code: 'TOR', zone: 'BIN', bin: 'B7' },
} as AssetSummary

const REMOTE_ASSET: AssetSummary = {
  ...ASSET,
  location: { warehouse_code: 'MTL', zone: 'BIN', bin: 'C3' },
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

type UpdateAssetLocationFn = (barcode: string, data: UpdateAssetLocation) => Promise<void>

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
  return screen.getByLabelText('Asset')
}

function scan(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

async function settle(ms = DEBOUNCE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function scanBoth(location: string, barcode: string) {
  scan(locationInput(), location)
  scan(assetInput(), barcode)
  await settle()
}

describe('PutAwayPage', () => {
  let updateAssetLocation: UpdateAssetLocationFn

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.useFakeTimers()
    getAssetByBarcode.mockReset()
    getAssetByBarcode.mockResolvedValue(ASSET)
    updateAssetLocation = vi.fn().mockResolvedValue(undefined)
    useAssetStore.setState({ updateAssetLocation })
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

      scan(locationInput(), 'a1')
      await settle()

      expect(screen.queryByText('Location not available')).not.toBeInTheDocument()
    })

    it('moves the caret to the asset field once the location matches', async () => {
      renderPage()

      scan(locationInput(), 'a1')
      await settle()

      expect(assetInput()).toHaveFocus()
    })

    it('drops the error when the field is emptied', async () => {
      renderPage()

      scan(locationInput(), 'zz9')
      await settle()
      expect(screen.getByText('Location not available')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Clear'))
      await settle()

      expect(screen.queryByText('Location not available')).not.toBeInTheDocument()
    })

    it('resolves a location the scanner sends in lower case', async () => {
      renderPage()

      scan(locationInput(), 'a1')
      await settle()

      expect(locationInput()).toHaveValue('A1')
      expect(screen.queryByText('Location not available')).not.toBeInTheDocument()
    })
  })

  describe('the asset field', () => {
    it('waits before looking a barcode up', async () => {
      renderPage()

      scan(assetInput(), 'bc-1')

      expect(getAssetByBarcode).not.toHaveBeenCalled()

      await settle()

      expect(getAssetByBarcode).toHaveBeenCalledTimes(1)
    })

    it('looks up only the final value of a scan burst', async () => {
      renderPage()

      scan(assetInput(), 'b')
      await settle(100)
      scan(assetInput(), 'bc')
      await settle(100)
      scan(assetInput(), 'bc-1')
      await settle()

      expect(getAssetByBarcode).toHaveBeenCalledTimes(1)
      expect(getAssetByBarcode.mock.calls[0][0]).toBe('BC-1')
    })

    it('reports a barcode that does not resolve', async () => {
      getAssetByBarcode.mockRejectedValue(new Error('nope'))
      renderPage()

      scan(assetInput(), 'bc-9')
      await settle()

      expect(screen.getByText('Asset not found')).toBeInTheDocument()
    })

    it('does not look up an empty field', async () => {
      renderPage()

      scan(assetInput(), 'bc-1')
      await settle()
      fireEvent.click(screen.getByLabelText('Clear'))
      await settle()

      expect(getAssetByBarcode).toHaveBeenCalledTimes(1)
    })
  })

  describe('the move', () => {
    it('summarises the move once both fields resolve', async () => {
      renderPage()

      await scanBoth('a1', 'bc-1')

      expect(screen.getByText('CANON IRADXC3835I')).toBeInTheDocument()
      expect(screen.getByText('B7')).toBeInTheDocument()
      expect(screen.getByText('A1')).toBeInTheDocument()
    })

    it('warns when the asset is leaving another warehouse', async () => {
      getAssetByBarcode.mockResolvedValue(REMOTE_ASSET)
      renderPage()

      await scanBoth('a1', 'bc-1')

      expect(screen.getByText('Moving out of MTL into TOR')).toBeInTheDocument()
    })

    it('stays quiet when the asset is already in this warehouse', async () => {
      renderPage()

      await scanBoth('a1', 'bc-1')

      expect(screen.queryByText(/Moving out of/)).not.toBeInTheDocument()
    })

    it('sends the scanned location and clears the asset field', async () => {
      renderPage()

      await scanBoth('a1', 'bc-1')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      })

      expect(updateAssetLocation).toHaveBeenCalledWith('BC-1', {
        warehouse_id: 10,
        zone_id: 100,
        bin: 'A1',
      })
      expect(assetInput()).toHaveValue('')
      expect(locationInput()).toHaveValue('A1')
    })

    it('offers no move until both fields resolve', async () => {
      renderPage()

      scan(assetInput(), 'bc-1')
      await settle()

      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })
  })
})
