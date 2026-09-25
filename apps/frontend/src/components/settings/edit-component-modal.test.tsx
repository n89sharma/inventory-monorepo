import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Brand, ComponentSummary } from 'shared-types'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { EditComponentModal } from './edit-component-modal'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const BRANDS: Brand[] = [
  { id: 1, name: 'CANON' },
  { id: 2, name: 'RICOH' },
]

vi.mock('@/hooks/use-reference-data', () => ({
  useBrands: () => BRANDS,
}))

const updateComponent = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-component-mutations', () => ({
  useComponentMutations: () => ({ updateComponent }),
}))

const UNUSED_COMPONENT: ComponentSummary = {
  id: 7,
  brand_id: 2,
  brand_name: 'RICOH',
  name: 'SR3130',
  is_active: true,
  asset_count: 0,
}
const FITTED_COMPONENT: ComponentSummary = { ...UNUSED_COMPONENT, asset_count: 12 }

// Radix sizes the dialog with a ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderModal(component: ComponentSummary) {
  render(<EditComponentModal open={true} onOpenChange={vi.fn()} component={component} />)
}

describe('EditComponentModal', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  })

  it('lets the brand of an unused component be changed', () => {
    renderModal(UNUSED_COMPONENT)

    expect(screen.getByRole('button', { name: 'Clear brand' })).toBeInTheDocument()
  })

  it('fixes the brand of a component already fitted to assets', () => {
    renderModal(FITTED_COMPONENT)

    expect(screen.queryByRole('button', { name: 'Clear brand' })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('RICOH')).toBeDisabled()
    expect(screen.getByText(/Fitted to 12 assets/)).toBeInTheDocument()
  })

  it('sends the edited name and active flag for the record being edited', async () => {
    updateComponent.mockResolvedValueOnce(undefined)
    renderModal(FITTED_COMPONENT)

    fireEvent.change(screen.getByDisplayValue('SR3130'), { target: { value: 'SR3130-B' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Active' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Component' }))

    await waitFor(() => expect(updateComponent).toHaveBeenCalled())
    expect(updateComponent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: 'SR3130-B',
        is_active: false,
        brand: expect.objectContaining({ id: 2 }),
      }),
    )
  })
})
