import { useAssetStore } from '@/data/store/asset-store'
import type { AssetPricing } from '@/hooks/use-asset-detail'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AssetCost, AssetSummary, BulkUpdateAssetPricing } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BulkEditPricingModal } from './bulk-edit-pricing-modal'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// The modal reads its server prices through this hook; the tests drive it directly so a
// "background revalidation" is just a new object arriving on a later render.
const pricingState = vi.hoisted(() => ({
  data: {} as AssetPricing,
  isLoading: false,
}))

vi.mock('@/hooks/use-asset-detail', () => ({
  useAssetPricing: () => pricingState,
  assetDetailKey: (barcode: string) => `asset:${barcode}`,
  clearAssetDetail: vi.fn(),
  invalidateAssetDetails: vi.fn(),
  invalidateAssetPricing: vi.fn(),
}))

const ASSET_ONE: AssetSummary = {
  barcode: 'BC-1',
  serial_number: 'SN-1',
  brand: 'CANON',
  model: 'IRADXC3835I',
  meter_total: 1000,
} as AssetSummary

const ASSET_TWO: AssetSummary = {
  ...ASSET_ONE,
  barcode: 'BC-2',
  serial_number: 'SN-2',
}

function makeCost(overrides: Partial<AssetCost>): AssetCost {
  return {
    purchase_cost: null,
    transport_cost: null,
    transfer_cost: null,
    processing_cost: null,
    other_cost: null,
    parts_cost: null,
    total_cost: null,
    sale_price: null,
    ...overrides,
  }
}

function priceInput(label: string, barcode: string): HTMLInputElement {
  const input = screen.getByLabelText(`${label} for ${barcode}`)
  if (!(input instanceof HTMLInputElement)) throw new Error(`No input for ${label} / ${barcode}`)
  return input
}

function type(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

type BulkUpdateFn = (items: BulkUpdateAssetPricing['items']) => Promise<void>

function renderModal(assets: AssetSummary[] = [ASSET_ONE]) {
  const onOpenChange = vi.fn()
  const onSaveSuccess = vi.fn()
  const view = render(
    <BulkEditPricingModal
      onOpenChange={onOpenChange}
      selectedAssets={assets}
      onSaveSuccess={onSaveSuccess}
    />,
  )
  function rerender() {
    view.rerender(
      <BulkEditPricingModal
        onOpenChange={onOpenChange}
        selectedAssets={assets}
        onSaveSuccess={onSaveSuccess}
      />,
    )
  }
  return { onOpenChange, onSaveSuccess, rerender }
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}

function cancel() {
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
}

describe('BulkEditPricingModal', () => {
  let bulkUpdatePricing: BulkUpdateFn

  beforeEach(() => {
    pricingState.data = {}
    pricingState.isLoading = false
    bulkUpdatePricing = vi.fn().mockResolvedValue(undefined)
    useAssetStore.setState({ bulkUpdatePricing })
  })

  it('shows a spinner instead of the table while the prices load', () => {
    pricingState.isLoading = true
    renderModal()

    expect(screen.getByText('Loading pricing…')).toBeInTheDocument()
    expect(screen.queryByLabelText('Purchase Cost for BC-1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('fills each cell from the server price and leaves nulls blank', () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150, sale_price: 400 }) }
    renderModal()

    expect(priceInput('Purchase Cost', 'BC-1')).toHaveValue('150')
    expect(priceInput('Sale Price', 'BC-1')).toHaveValue('400')
    expect(priceInput('Transport Cost', 'BC-1')).toHaveValue('')
  })

  it('never sends an asset whose price failed to load and was not edited', async () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150 }) }
    renderModal([ASSET_ONE, ASSET_TWO])

    expect(priceInput('Purchase Cost', 'BC-2')).toHaveValue('')

    type(priceInput('Purchase Cost', 'BC-1'), '175')
    save()

    await waitFor(() => expect(bulkUpdatePricing).toHaveBeenCalled())
    const [items] = vi.mocked(bulkUpdatePricing).mock.calls[0]
    expect(items).toEqual([{ barcode: 'BC-1', purchase_cost: 175 }])
  })

  it('edits only the cell that was typed in', () => {
    pricingState.data = {
      'BC-1': makeCost({ purchase_cost: 150 }),
      'BC-2': makeCost({ purchase_cost: 250 }),
    }
    renderModal([ASSET_ONE, ASSET_TWO])

    type(priceInput('Purchase Cost', 'BC-1'), '175')

    expect(priceInput('Purchase Cost', 'BC-1')).toHaveValue('175')
    expect(priceInput('Purchase Cost', 'BC-2')).toHaveValue('250')
    expect(priceInput('Sale Price', 'BC-1')).toHaveValue('')
  })

  it('sends only the fields that were typed, leaving the rest to the server', async () => {
    pricingState.data = {
      'BC-1': makeCost({ purchase_cost: 150, transport_cost: 20, parts_cost: 35 }),
    }
    const { onSaveSuccess } = renderModal()

    type(priceInput('Purchase Cost', 'BC-1'), '175')
    save()

    await waitFor(() => expect(bulkUpdatePricing).toHaveBeenCalledTimes(1))
    const [items] = vi.mocked(bulkUpdatePricing).mock.calls[0]
    expect(items).toEqual([{ barcode: 'BC-1', purchase_cost: 175 }])
    await waitFor(() => expect(onSaveSuccess).toHaveBeenCalled())
  })

  it('sends nothing when no cell was edited', async () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150 }) }
    const { onOpenChange } = renderModal()

    save()

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(bulkUpdatePricing).not.toHaveBeenCalled()
  })

  it('keeps a typed value when fresh server prices arrive underneath it', () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150, sale_price: 400 }) }
    const { rerender } = renderModal()

    type(priceInput('Purchase Cost', 'BC-1'), '175')

    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 900, sale_price: 950 }) }
    rerender()

    expect(priceInput('Purchase Cost', 'BC-1')).toHaveValue('175')
    expect(priceInput('Sale Price', 'BC-1')).toHaveValue('950')
  })

  it('closes without confirming when nothing was edited', () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150 }) }
    const { onOpenChange } = renderModal()

    cancel()

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument()
  })

  it('asks to confirm when an edit would be lost', () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150 }) }
    const { onOpenChange } = renderModal()

    type(priceInput('Purchase Cost', 'BC-1'), '175')
    cancel()

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('treats a value typed back to the server value as no edit', () => {
    pricingState.data = { 'BC-1': makeCost({ purchase_cost: 150 }) }
    const { onOpenChange } = renderModal()

    type(priceInput('Purchase Cost', 'BC-1'), '175')
    type(priceInput('Purchase Cost', 'BC-1'), '150')
    cancel()

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
