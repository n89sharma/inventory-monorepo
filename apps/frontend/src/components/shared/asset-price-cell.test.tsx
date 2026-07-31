import { createPriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Row, Table, TableMeta } from '@tanstack/react-table'
import type { AssetCost, AssetSummary } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { AssetPriceCell } from './asset-price-cell'

const LABEL = 'Purchase Cost'
const BARCODE = 'BC-1'
const FIELD_LABEL = `${LABEL} for ${BARCODE}`

function makeCost(overrides: Partial<AssetCost> = {}): AssetCost {
  return {
    purchase_cost: 100,
    transport_cost: 20,
    processing_cost: 5,
    other_cost: 0,
    parts_cost: 0,
    total_cost: 125,
    sale_price: 200,
    ...overrides,
  }
}

function makeAsset(cost: AssetCost | null): AssetSummary {
  return {
    id: 1,
    barcode: BARCODE,
    brand: 'CANON',
    model: 'IR-2020',
    asset_type: 'COPIER',
    serial_number: 'SN-1',
    meter_total: 0,
    cassettes: null,
    internal_finisher: null,
    accessories: [],
    weight: 0,
    size: 0,
    status: 'IN_STOCK',
    readiness: 'PP_OK',
    location: null,
    purchase_invoice_number: null,
    sales_invoice_number: null,
    is_in_transit: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    cost,
  }
}

interface RenderedCell {
  // The read button, which is what the cell shows until an edit begins.
  readButton: HTMLButtonElement
  openEditor: () => HTMLInputElement
  // Re-renders with a different saved cost, standing in for a background revalidation.
  revalidate: (cost: AssetCost | null) => void
}

function renderCell(
  savePriceField: TableMeta<AssetSummary>['savePriceField'],
  cost: AssetCost | null = makeCost(),
): RenderedCell {
  // A single-cell grid: every direction resolves to null, so movement is covered by
  // price-cell-navigation.test.ts and asset-price-grid.test.tsx instead.
  const table = {
    options: { meta: { savePriceField } },
    getRowModel: () => ({ rows: [{ id: BARCODE }] }),
    getVisibleLeafColumns: () => [{ id: 'purchase_cost' }],
  } as unknown as Table<AssetSummary>
  const registry = createPriceCellEditorRegistry()
  const cell = (next: AssetCost | null) => (
    <AssetPriceCell
      row={{ id: BARCODE, original: makeAsset(next) } as Row<AssetSummary>}
      field="purchase_cost"
      label={LABEL}
      table={table}
      editorRegistry={registry}
    />
  )
  const { rerender } = render(cell(cost))
  const readButton = screen.getByLabelText(FIELD_LABEL)
  if (!(readButton instanceof HTMLButtonElement)) throw new Error('Expected a price read button')
  return {
    readButton,
    openEditor: () => {
      fireEvent.click(readButton)
      const input = screen.getByLabelText(FIELD_LABEL)
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected a price input')
      return input
    },
    revalidate: (next) => rerender(cell(next)),
  }
}

function type(input: HTMLInputElement, value: string) {
  input.focus()
  fireEvent.change(input, { target: { value } })
}

function currentField(): HTMLElement {
  return screen.getByLabelText(FIELD_LABEL)
}

describe('AssetPriceCell', () => {
  it('shows the formatted amount as a button until it is clicked', () => {
    const { readButton, openEditor } = renderCell(vi.fn())

    expect(readButton).toHaveTextContent('$100.00')

    expect(openEditor()).toHaveValue('100')
  })

  it('shows a missing cost as zero in both states', () => {
    const { readButton, openEditor } = renderCell(vi.fn(), null)

    expect(readButton).toHaveTextContent('$0.00')
    expect(openEditor()).toHaveValue('0')
  })

  it('commits the parsed value on blur', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '150.50')
    input.blur()

    await waitFor(() =>
      expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 150.5),
    )
  })

  it('returns to the read state on blur', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '150.50')
    input.blur()

    await waitFor(() => expect(currentField()).toBeInstanceOf(HTMLButtonElement))
    expect(currentField()).toHaveTextContent('$150.50')
  })

  it('does not commit when the value is unchanged', () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    input.focus()
    input.blur()

    expect(savePriceField).not.toHaveBeenCalled()
  })

  it('commits a blank input as zero', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '')
    input.blur()

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 0))
  })

  it('strips characters that are not part of a decimal', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '1a2.3.4')
    expect(input).toHaveValue('12.34')
    input.blur()

    await waitFor(() =>
      expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 12.34),
    )
  })

  it('keeps the typed value and marks the abandoned cell invalid when the save fails', async () => {
    const savePriceField = vi.fn().mockRejectedValue(new Error('nope'))
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '175')
    input.blur()

    await waitFor(() => expect(currentField()).toHaveAttribute('aria-invalid', 'true'))
    expect(currentField()).toHaveTextContent('$175.00')
  })

  it('restores the typed value when a revalidation lands during a failed save', async () => {
    let rejectSave: (reason: Error) => void = () => {}
    const savePriceField = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject
        }),
    )
    const { openEditor, revalidate } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '175')
    input.blur()
    await waitFor(() => expect(savePriceField).toHaveBeenCalled())

    revalidate(makeCost({ purchase_cost: 250 }))
    await waitFor(() => expect(currentField()).toHaveTextContent('$250.00'))

    rejectSave(new Error('nope'))

    await waitFor(() => expect(currentField()).toHaveTextContent('$175.00'))
    expect(currentField()).toHaveAttribute('aria-invalid', 'true')
  })

  it('marks the field invalid when the table meta has no save callback', async () => {
    const { openEditor } = renderCell(undefined)
    const input = openEditor()

    type(input, '175')
    input.blur()

    await waitFor(() => expect(currentField()).toHaveAttribute('aria-invalid', 'true'))
    expect(currentField()).toHaveTextContent('$175.00')
  })

  it('reverts to the read state on Escape without committing', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '999')
    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => expect(currentField()).toBeInstanceOf(HTMLButtonElement))
    expect(currentField()).toHaveTextContent('$100.00')
    expect(currentField()).toHaveFocus()
    expect(savePriceField).not.toHaveBeenCalled()
  })

  it('adopts a revalidation that lands after an Escape', async () => {
    const { openEditor, revalidate } = renderCell(vi.fn())
    const input = openEditor()

    type(input, '999')
    fireEvent.keyDown(input, { key: 'Escape' })
    revalidate(makeCost({ purchase_cost: 300 }))

    await waitFor(() => expect(currentField()).toHaveTextContent('$300.00'))
  })

  it('commits and leaves edit mode when there is nowhere to move', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '410')
    fireEvent.keyDown(input, { key: 'Tab' })

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 410))
    expect(currentField()).toBeInstanceOf(HTMLButtonElement)
    expect(currentField()).toHaveFocus()
  })

  it('commits once when Enter is pressed on the last row', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { openEditor } = renderCell(savePriceField)
    const input = openEditor()

    type(input, '410')
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(savePriceField).toHaveBeenCalledOnce())
    expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 410)
    expect(currentField()).toBeInstanceOf(HTMLButtonElement)
  })

  it('leaves a Tab on the read button to the browser when there is nowhere to move', () => {
    const { readButton } = renderCell(vi.fn())
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

    readButton.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
