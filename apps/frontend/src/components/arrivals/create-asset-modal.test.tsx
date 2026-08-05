import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AssetSummary, ModelSummary, Status } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateAssetModal } from './create-asset-modal'

// A supplies model carries no meter, cassette or consumable fields, so the form
// is valid with nothing but a model and a serial number.
const MODEL: ModelSummary = {
  id: 1,
  brand_id: 1,
  brand_name: 'CANON',
  model_name: 'PALLET',
  asset_type: 'WAREHOUSE_SUPPLIES',
  weight: 0,
  size: 0,
  is_colour: false,
}
const MODEL_LABEL = 'CANON PALLET'
const UNTESTED: Status = { id: 1, status: 'UNTESTED' }
const CREATED_ASSET = { id: 10, barcode: 'BC-10' } as AssetSummary
const SERIAL = 'SN-FIRST'

function seedStores() {
  useModelStore.setState({ models: [MODEL] })
  useReferenceDataStore.setState({
    readinesses: [UNTESTED],
    countries: [],
    components: [],
    coreFunctions: [],
    errors: [],
  })
  useAssetStore.setState({ printBarcodes: vi.fn().mockResolvedValue(undefined) })
}

// The fields have no htmlFor/id pairing, so each control is found through the
// label it sits next to in HorizontalField's grid.
function fieldControl(label: string, selector: string): HTMLElement {
  const row = screen.getByText(label).parentElement
  const control = row?.querySelector(selector)
  if (!(control instanceof HTMLElement)) throw new Error(`No ${selector} next to "${label}"`)
  return control
}

function serialInput(): HTMLInputElement {
  const input = fieldControl('Serial Number', 'input')
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a serial number input')
  return input
}

function renderModal(onCreateAsset: (asset: unknown) => Promise<AssetSummary>) {
  const onOpenChange = vi.fn()
  const modal = (open: boolean) => (
    <CreateAssetModal
      open={open}
      onOpenChange={onOpenChange}
      onCreateAsset={onCreateAsset as never}
    />
  )
  // The modal stays mounted while the page toggles `open`, which is what makes a
  // form that never clears itself visible on the next open.
  const { rerender } = render(modal(true))
  return {
    onOpenChange,
    reopen: () => {
      rerender(modal(false))
      rerender(modal(true))
    },
  }
}

function pickModel() {
  fireEvent.change(fieldControl('Model', 'input[role="combobox"]'), {
    target: { value: 'PALLET' },
  })
  fireEvent.click(screen.getByRole('option', { name: MODEL_LABEL }))
}

describe('CreateAssetModal', () => {
  beforeEach(seedStores)

  it('opens blank again after an asset is created', async () => {
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    const { onOpenChange, reopen } = renderModal(onCreateAsset)

    pickModel()
    fireEvent.change(serialInput(), { target: { value: SERIAL } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }))

    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())
    expect(onCreateAsset.mock.calls[0][0]).toMatchObject({ serialNumber: SERIAL, model: MODEL })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))

    reopen()

    expect(serialInput()).toHaveValue('')
    expect(screen.queryByText(MODEL_LABEL)).not.toBeInTheDocument()
  })

  it('opens blank again after the edits are discarded', async () => {
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    const { onOpenChange, reopen } = renderModal(onCreateAsset)

    pickModel()
    fireEvent.change(serialInput(), { target: { value: SERIAL } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onCreateAsset).not.toHaveBeenCalled()

    reopen()

    expect(serialInput()).toHaveValue('')
    expect(screen.queryByText(MODEL_LABEL)).not.toBeInTheDocument()
  })

  it('keeps the form open with the typed values when the create fails', async () => {
    const onCreateAsset = vi.fn().mockRejectedValue(new Error('rejected'))
    const { onOpenChange } = renderModal(onCreateAsset)

    pickModel()
    fireEvent.change(serialInput(), { target: { value: SERIAL } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }))

    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(serialInput()).toHaveValue(SERIAL)
  })
})
