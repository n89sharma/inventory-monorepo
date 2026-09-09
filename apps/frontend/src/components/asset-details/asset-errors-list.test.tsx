import { AssetErrorsList } from '@/components/asset-details/asset-errors-editor'
import { TooltipProvider } from '@/components/shadcn/tooltip'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AssetError } from 'shared-types'
import { beforeAll, describe, expect, it } from 'vitest'

const CODE = 'E197-0005'
const SHORT_DESCRIPTION = 'Fuser unit needs replacing.'
// Trimmed, because the component trims before rendering and the stub below matches on text.
const LONG_DESCRIPTION = 'Fusing thermistor error 4: End thermistor (software). '.repeat(40).trim()

// jsdom reports every element as 0x0, so a clamp can never "bite" on its own.
// Only the long description reports overflow, which is what the component measures.
const CLAMPED_METRICS = { scrollHeight: 200, clientHeight: 48 } as const

function stubLayoutMetrics() {
  for (const [metric, clampedValue] of Object.entries(CLAMPED_METRICS)) {
    Object.defineProperty(HTMLElement.prototype, metric, {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent === LONG_DESCRIPTION ? clampedValue : 0
      },
    })
  }
}

function makeAssetError(overrides: Partial<AssetError> = {}): AssetError {
  return {
    error_id: 1,
    brand_id: 1,
    code: CODE,
    description: SHORT_DESCRIPTION,
    category: 'Hardware',
    is_fixed: false,
    added_at: null,
    added_by: null,
    fixed_at: null,
    fixed_by: null,
    ...overrides,
  }
}

function renderList(errors: AssetError[]) {
  render(
    <TooltipProvider>
      <AssetErrorsList errors={errors} />
    </TooltipProvider>,
  )
}

function triggerFor(code: string): HTMLElement | null {
  const trigger = screen.getByText(code).closest('[data-slot="tooltip-trigger"]')
  return trigger instanceof HTMLElement ? trigger : null
}

describe('AssetErrorsList', () => {
  beforeAll(stubLayoutMetrics)

  it('renders the code and description inline', () => {
    renderList([makeAssetError()])

    expect(screen.getByText(CODE)).toBeInTheDocument()
    expect(screen.getByText(SHORT_DESCRIPTION)).toBeInTheDocument()
  })

  it.each([null, '', '   '])('renders no description line for %j', (description) => {
    renderList([makeAssetError({ description })])

    expect(screen.getByText(CODE)).toBeInTheDocument()
    expect(triggerFor(CODE)).toBeNull()
  })

  it('adds no tooltip when the description fits', () => {
    renderList([makeAssetError()])

    expect(triggerFor(CODE)).toBeNull()
  })

  it('adds a focusable tooltip when the description is clamped', async () => {
    renderList([makeAssetError({ description: LONG_DESCRIPTION })])

    await waitFor(() => expect(triggerFor(CODE)).not.toBeNull())
    expect(triggerFor(CODE)).toHaveAttribute('tabindex', '0')
  })

  it('reveals the full description on focus', async () => {
    renderList([makeAssetError({ description: LONG_DESCRIPTION })])
    await waitFor(() => expect(triggerFor(CODE)).not.toBeNull())

    fireEvent.focus(triggerFor(CODE) as HTMLElement)

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('Fusing thermistor error 4')
  })

  it('shows no remove control, unlike the editor', () => {
    renderList([makeAssetError()])

    expect(screen.queryByRole('button', { name: /remove error/i })).not.toBeInTheDocument()
  })

  it('renders a static status badge that is not a button', () => {
    renderList([makeAssetError({ is_fixed: true })])

    const badge = screen.getByText('Fixed')
    expect(badge.closest('button')).toBeNull()
  })
})
