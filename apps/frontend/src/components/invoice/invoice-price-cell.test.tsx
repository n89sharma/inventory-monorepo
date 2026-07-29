import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Table, TableMeta } from '@tanstack/react-table'
import type { AssetCost, AssetSummary } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { InvoicePriceCell } from './invoice-price-cell'

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
  input: HTMLInputElement
  // Re-renders with a different saved cost, standing in for a background revalidation.
  revalidate: (cost: AssetCost | null) => void
}

function renderCell(
  savePriceField: TableMeta<AssetSummary>['savePriceField'],
  cost: AssetCost | null = makeCost(),
): RenderedCell {
  const table = { options: { meta: { savePriceField } } } as Table<AssetSummary>
  const cell = (next: AssetCost | null) => (
    <InvoicePriceCell asset={makeAsset(next)} field="purchase_cost" label={LABEL} table={table} />
  )
  const { rerender } = render(cell(cost))
  const input = screen.getByLabelText(FIELD_LABEL)
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a price input')
  return { input, revalidate: (next) => rerender(cell(next)) }
}

function type(input: HTMLInputElement, value: string) {
  input.focus()
  fireEvent.change(input, { target: { value } })
}

describe('InvoicePriceCell', () => {
  it('commits the parsed value on blur', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField)

    type(input, '150.50')
    input.blur()

    await waitFor(() =>
      expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 150.5),
    )
  })

  it('does not commit when the value is unchanged', () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField)

    input.focus()
    input.blur()

    expect(savePriceField).not.toHaveBeenCalled()
  })

  it('commits a blank input as zero', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField)

    type(input, '')
    input.blur()

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 0))
  })

  it('strips characters that are not part of a decimal', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField)

    type(input, '1a2.3.4')
    expect(input).toHaveValue('12.34')
    input.blur()

    await waitFor(() =>
      expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 12.34),
    )
  })

  it('keeps the typed value and marks the field invalid when the save fails', async () => {
    const savePriceField = vi.fn().mockRejectedValue(new Error('nope'))
    const { input } = renderCell(savePriceField)

    type(input, '175')
    input.blur()

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(input).toHaveValue('175')
  })

  it('restores the typed value when a revalidation lands during a failed save', async () => {
    let rejectSave: (reason: Error) => void = () => {}
    const savePriceField = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject
        }),
    )
    const { input, revalidate } = renderCell(savePriceField)

    type(input, '175')
    input.blur()
    await waitFor(() => expect(savePriceField).toHaveBeenCalled())

    revalidate(makeCost({ purchase_cost: 250 }))
    await waitFor(() => expect(input).toHaveValue('250'))

    rejectSave(new Error('nope'))

    await waitFor(() => expect(input).toHaveValue('175'))
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('marks the field invalid when the table meta has no save callback', async () => {
    const { input } = renderCell(undefined)

    type(input, '175')
    input.blur()

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(input).toHaveValue('175')
  })

  it('restores the saved value on Escape without committing or blurring', () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField)

    type(input, '999')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(input).toHaveValue('100')
    expect(input).toHaveFocus()
    expect(savePriceField).not.toHaveBeenCalled()
  })

  it('does not commit when the cell is left after an Escape', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField)

    type(input, '999')
    fireEvent.keyDown(input, { key: 'Escape' })
    input.blur()

    await waitFor(() => expect(input).toHaveValue('100'))
    expect(savePriceField).not.toHaveBeenCalled()
  })

  it('treats a missing cost as zero', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    const { input } = renderCell(savePriceField, null)

    expect(input).toHaveValue('0')
    type(input, '40')
    input.blur()

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith(BARCODE, 'purchase_cost', 40))
  })
})
