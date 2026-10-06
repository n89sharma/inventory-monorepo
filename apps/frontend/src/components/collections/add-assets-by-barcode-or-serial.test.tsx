import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AssetSummary, BarcodeSuggestion } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddAssetsByBarcodeOrSerial } from './add-assets-by-barcode-or-serial'

const getAssetByBarcode = vi.hoisted(() => vi.fn())
vi.mock('@/data/api/transfer-api', () => ({ getAssetByBarcode }))

const searchResults = vi.hoisted(() => ({ assets: [] as BarcodeSuggestion[] }))
vi.mock('@/hooks/use-global-search', () => ({
  ASSET_SEARCH_TYPES: ['assets'],
  useGlobalSearch: () => ({ results: searchResults, isLoading: false }),
}))

const ASSET: AssetSummary = { barcode: 'BC-1', serial_number: 'SN-1' } as AssetSummary
const SECOND_ASSET: AssetSummary = { barcode: 'BC-2', serial_number: 'SN-2' } as AssetSummary

const ASSET_SUGGESTION: BarcodeSuggestion = {
  barcode: 'BC-1',
  serial_number: 'SN-1',
  asset_type: 'COPIER',
  model: 'IRADXC3835I',
}

function deferLookup(): (asset: AssetSummary) => void {
  let resolveLookup: (asset: AssetSummary) => void = () => {}
  getAssetByBarcode.mockReturnValueOnce(
    new Promise<AssetSummary>((resolve) => {
      resolveLookup = resolve
    }),
  )
  return (asset) => resolveLookup(asset)
}

function assetInput(): HTMLElement {
  return screen.getByLabelText('Add asset by barcode or serial number')
}

function type(value: string) {
  fireEvent.change(assetInput(), { target: { value } })
}

async function pressEnter() {
  await act(async () => {
    fireEvent.keyDown(assetInput(), { key: 'Enter' })
  })
}

describe('AddAssetsByBarcodeOrSerial', () => {
  let onAddAsset: (asset: AssetSummary) => void

  beforeEach(() => {
    getAssetByBarcode.mockReset()
    searchResults.assets = []
    onAddAsset = vi.fn()
  })

  function renderInput() {
    return render(
      <AddAssetsByBarcodeOrSerial getAssets={() => []} onAddAsset={onAddAsset} entityName="list" />,
    )
  }

  it('looks up and adds once when Enter arrives twice before the lookup returns', async () => {
    const resolveLookup = deferLookup()
    renderInput()

    type('bc-1')
    await pressEnter()
    await pressEnter()
    await act(async () => resolveLookup(ASSET))

    expect(getAssetByBarcode).toHaveBeenCalledTimes(1)
    expect(onAddAsset).toHaveBeenCalledTimes(1)
  })

  it('commits once when an exact match arrives while the Enter lookup is pending', async () => {
    const onCommit = vi.fn().mockResolvedValue(undefined)
    const resolveLookup = deferLookup()
    const props = { getAssets: () => [], onAddAsset, entityName: 'hold', onCommit }
    const { rerender } = render(<AddAssetsByBarcodeOrSerial {...props} />)

    type('sn-1')
    await pressEnter()
    searchResults.assets = [ASSET_SUGGESTION]
    rerender(<AddAssetsByBarcodeOrSerial {...props} />)
    await act(async () => resolveLookup(ASSET))

    expect(getAssetByBarcode).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('takes the next scan once the previous lookup has finished', async () => {
    getAssetByBarcode.mockResolvedValueOnce(ASSET).mockResolvedValueOnce(SECOND_ASSET)
    renderInput()

    type('bc-1')
    await pressEnter()
    type('bc-2')
    await pressEnter()

    expect(onAddAsset).toHaveBeenCalledWith(ASSET)
    expect(onAddAsset).toHaveBeenCalledWith(SECOND_ASSET)
  })

  it('takes the next scan after a lookup fails', async () => {
    getAssetByBarcode.mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce(ASSET)
    renderInput()

    type('bc-9')
    await pressEnter()
    expect(screen.getByText('Asset not found.')).toBeInTheDocument()

    type('bc-1')
    await pressEnter()

    expect(onAddAsset).toHaveBeenCalledWith(ASSET)
  })
})
