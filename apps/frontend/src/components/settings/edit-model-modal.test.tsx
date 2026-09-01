import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AssetType, Brand, ModelSummary } from 'shared-types'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { EditModelModal } from './edit-model-modal'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const BRANDS: Brand[] = [
  { id: 1, name: 'CANON' },
  { id: 2, name: 'RICOH' },
]
const ASSET_TYPES: AssetType[] = [
  { id: 10, asset_type: 'COPIER' },
  { id: 20, asset_type: 'PRINTER' },
]

vi.mock('@/hooks/use-reference-data', () => ({
  useBrands: () => BRANDS,
  useAssetTypes: () => ASSET_TYPES,
}))

const updateModel = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-model-mutations', () => ({
  useModelMutations: () => ({ updateModel }),
}))

const MODEL: ModelSummary = {
  id: 7,
  brand_id: 2,
  brand_name: 'RICOH',
  model_name: 'IMAGEPRESS-C1+',
  asset_type_id: 20,
  asset_type: 'PRINTER',
  weight: 42,
  size: 3,
  is_colour: true,
}

// Radix sizes the dialog with a ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderModal(onOpenChange = vi.fn()) {
  render(<EditModelModal open={true} onOpenChange={onOpenChange} model={MODEL} />)
  return { onOpenChange }
}

describe('EditModelModal', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  })

  it('prefills every field from the record, including the brand and asset type', () => {
    renderModal()

    expect(screen.getByDisplayValue('IMAGEPRESS-C1+')).toBeInTheDocument()
    expect(screen.getByDisplayValue('42')).toBeInTheDocument()
    // Both resolved through brand_id / asset_type_id, not the display strings. The asset type
    // is read off the select trigger, since every option also renders its label.
    expect(screen.getByText('RICOH')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('PRINTER')
  })

  it('sends the edited values for the record being edited', async () => {
    updateModel.mockResolvedValueOnce(undefined)
    renderModal()

    fireEvent.change(screen.getByDisplayValue('IMAGEPRESS-C1+'), {
      target: { value: 'IMAGEPRESS-C2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Model' }))

    await waitFor(() => expect(updateModel).toHaveBeenCalled())
    expect(updateModel).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ name: 'IMAGEPRESS-C2', is_colour: true }),
    )
  })

  it('guards an unsaved edit instead of closing straight away', async () => {
    const { onOpenChange } = renderModal()

    fireEvent.change(screen.getByDisplayValue('IMAGEPRESS-C1+'), {
      target: { value: 'CHANGED' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
