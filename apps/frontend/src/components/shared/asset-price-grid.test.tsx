import { TooltipProvider } from '@/components/shadcn/tooltip'
import { DataTable } from '@/components/shared/data-table'
import {
  createArrivalDetailColumns,
  createDepartureDetailColumns,
  createInvoiceDetailColumns,
  createTransferDetailColumns,
} from '@/components/table-columns/collection-detail-columns'
import { createPriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { TableMeta } from '@tanstack/react-table'
import { MemoryRouter } from 'react-router-dom'
import type { AssetCost, AssetSummary } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'

// Data order, deliberately not barcode order so sorting by barcode changes the first row.
const BARCODES = ['BC-2', 'BC-3', 'BC-1'] as const
const SORTED_BARCODES = ['BC-1', 'BC-2', 'BC-3'] as const
const FIRST_FIELD_LABEL = 'Purchase Cost'
const LAST_FIELD_LABEL = 'Sale Price'

function makeCost(): AssetCost {
  return {
    purchase_cost: 100,
    transport_cost: 20,
    processing_cost: 5,
    other_cost: 0,
    parts_cost: 0,
    total_cost: 125,
    sale_price: 200,
  }
}

function makeAsset(barcode: string, id: number): AssetSummary {
  return {
    id,
    barcode,
    brand: 'CANON',
    model: 'IR-2020',
    asset_type: 'COPIER',
    serial_number: `SN-${id}`,
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
    cost: makeCost(),
  }
}

const ASSETS = BARCODES.map((barcode, index) => makeAsset(barcode, index + 1))
const ASSET_COLUMN_VISIBILITY = { created_at: false }
const getAssetRowId = (asset: AssetSummary) => asset.barcode
const getAssetHref = (asset: AssetSummary) => `/invoices/INV-1/${asset.barcode}`

function fieldOf(label: string, barcode: string): HTMLElement {
  return screen.getByLabelText(`${label} for ${barcode}`)
}

// Every priced detail table builds its cost columns from the same helper, so the grid behaviour
// is asserted against all four rather than trusting invoices to stand in for the rest.
const PRICED_COLUMN_BUILDERS = {
  arrivals: createArrivalDetailColumns,
  transfers: createTransferDetailColumns,
  departures: createDepartureDetailColumns,
  invoices: createInvoiceDetailColumns,
} as const

type PricedSection = keyof typeof PRICED_COLUMN_BUILDERS

const PRICED_SECTIONS = Object.keys(PRICED_COLUMN_BUILDERS) as PricedSection[]

function makeRenderGrid(section: PricedSection) {
  return (savePriceField: TableMeta<AssetSummary>['savePriceField'] = vi.fn()) => {
    const columns = PRICED_COLUMN_BUILDERS[section]({
      getHref: getAssetHref,
      canViewPurchasePrice: true,
      canViewSalePrice: true,
      priceEditorRegistry: createPriceCellEditorRegistry(),
    })
    render(
      <MemoryRouter>
        <TooltipProvider>
          <DataTable
            columns={columns}
            data={ASSETS}
            getRowId={getAssetRowId}
            columnVisibility={ASSET_COLUMN_VISIBILITY}
            meta={{ savePriceField }}
          />
        </TooltipProvider>
      </MemoryRouter>,
    )
  }
}

// Opens the editor the way a user does, and waits for autoFocus to land the caret.
async function openEditor(label: string, barcode: string): Promise<HTMLInputElement> {
  fireEvent.click(fieldOf(label, barcode))
  await waitFor(() => expect(fieldOf(label, barcode)).toHaveFocus())
  const input = fieldOf(label, barcode)
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a price input')
  return input
}

async function expectEditing(label: string, barcode: string) {
  await waitFor(() => {
    const field = fieldOf(label, barcode)
    expect(field).toBeInstanceOf(HTMLInputElement)
    expect(field).toHaveFocus()
  })
}

describe.each(PRICED_SECTIONS)('the asset price grid on %s', (section) => {
  const renderGrid = makeRenderGrid(section)

  it('opens only the clicked cell', async () => {
    renderGrid()

    await openEditor(FIRST_FIELD_LABEL, 'BC-2')

    expect(fieldOf('Transport Cost', 'BC-2')).toBeInstanceOf(HTMLButtonElement)
    expect(fieldOf(FIRST_FIELD_LABEL, 'BC-3')).toBeInstanceOf(HTMLButtonElement)
  })

  it('commits the open editor when another cell is clicked', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    renderGrid(savePriceField)
    const input = await openEditor(FIRST_FIELD_LABEL, 'BC-2')

    fireEvent.change(input, { target: { value: '555' } })
    fireEvent.click(fieldOf(LAST_FIELD_LABEL, 'BC-3'))

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith('BC-2', 'purchase_cost', 555))
    await expectEditing(LAST_FIELD_LABEL, 'BC-3')
  })

  it('never renders a Total Cost editor, because the server derives it', async () => {
    renderGrid()

    fireEvent.click(fieldOf(FIRST_FIELD_LABEL, 'BC-2'))

    expect(screen.queryByLabelText('Total Cost for BC-2')).toBeNull()
  })

  it('skips Total Cost when tabbing right', async () => {
    renderGrid()
    const input = await openEditor('Processing Cost', 'BC-2')

    fireEvent.keyDown(input, { key: 'Tab' })

    await expectEditing(LAST_FIELD_LABEL, 'BC-2')
  })

  it('wraps past the last field to the next row leftmost field', async () => {
    renderGrid()
    const input = await openEditor(LAST_FIELD_LABEL, 'BC-2')

    fireEvent.keyDown(input, { key: 'Tab' })

    await expectEditing(FIRST_FIELD_LABEL, 'BC-3')
  })

  it('wraps back before the first field to the previous row rightmost field', async () => {
    renderGrid()
    const input = await openEditor(FIRST_FIELD_LABEL, 'BC-3')

    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

    await expectEditing(LAST_FIELD_LABEL, 'BC-2')
  })

  it('moves down the same column on Enter', async () => {
    renderGrid()
    const input = await openEditor('Transport Cost', 'BC-2')

    fireEvent.keyDown(input, { key: 'Enter' })

    await expectEditing('Transport Cost', 'BC-3')
  })

  it('commits and drops to the read state on Tab from the very last cell', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    renderGrid(savePriceField)
    const input = await openEditor(LAST_FIELD_LABEL, 'BC-1')

    fireEvent.change(input, { target: { value: '777' } })
    fireEvent.keyDown(input, { key: 'Tab' })

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith('BC-1', 'sale_price', 777))
    await waitFor(() => {
      const field = fieldOf(LAST_FIELD_LABEL, 'BC-1')
      expect(field).toBeInstanceOf(HTMLButtonElement)
      expect(field).toHaveFocus()
    })
  })

  it('commits and drops to the read state on Shift+Tab from the very first cell', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    renderGrid(savePriceField)
    const input = await openEditor(FIRST_FIELD_LABEL, 'BC-2')

    fireEvent.change(input, { target: { value: '888' } })
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith('BC-2', 'purchase_cost', 888))
    await waitFor(() =>
      expect(fieldOf(FIRST_FIELD_LABEL, 'BC-2')).toBeInstanceOf(HTMLButtonElement),
    )
  })

  it('commits and drops to the read state on Enter from the last row', async () => {
    const savePriceField = vi.fn().mockResolvedValue(undefined)
    renderGrid(savePriceField)
    const input = await openEditor('Transport Cost', 'BC-1')

    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(savePriceField).toHaveBeenCalledWith('BC-1', 'transport_cost', 999))
    await waitFor(() => expect(fieldOf('Transport Cost', 'BC-1')).toBeInstanceOf(HTMLButtonElement))
  })

  it('tabs read-to-read without opening an editor on the way out of the grid', async () => {
    renderGrid()
    const input = await openEditor(LAST_FIELD_LABEL, 'BC-1')

    fireEvent.keyDown(input, { key: 'Tab' })
    await waitFor(() => expect(fieldOf(LAST_FIELD_LABEL, 'BC-1')).toHaveFocus())

    const readButton = fieldOf(LAST_FIELD_LABEL, 'BC-1')
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    readButton.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('reopens the editor on Enter from the read state', async () => {
    renderGrid()

    fireEvent.keyDown(fieldOf(FIRST_FIELD_LABEL, 'BC-2'), { key: 'Enter' })
    fireEvent.click(fieldOf(FIRST_FIELD_LABEL, 'BC-2'))

    await expectEditing(FIRST_FIELD_LABEL, 'BC-2')
  })

  it('gives the grid exactly one keyboard entry point, on the first visible row', () => {
    renderGrid()

    const entryCells = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('tabindex') === '0')

    expect(entryCells).toHaveLength(1)
    expect(entryCells[0]).toBe(fieldOf(FIRST_FIELD_LABEL, BARCODES[0]))
  })

  it('moves the keyboard entry point when the table is re-sorted', async () => {
    renderGrid()

    fireEvent.click(screen.getByRole('button', { name: /Barcode/ }))

    await waitFor(() =>
      expect(fieldOf(FIRST_FIELD_LABEL, SORTED_BARCODES[0])).toHaveAttribute('tabindex', '0'),
    )
    expect(fieldOf(FIRST_FIELD_LABEL, BARCODES[0])).toHaveAttribute('tabindex', '-1')
  })

  it('does not navigate to the asset when a price cell is clicked', async () => {
    renderGrid()

    await openEditor(FIRST_FIELD_LABEL, 'BC-2')

    expect(screen.getByRole('link', { name: 'BC-2' })).toBeInTheDocument()
  })
})
