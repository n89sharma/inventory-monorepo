import { fireEvent, render, screen, within } from '@testing-library/react'
import { BID_COLUMN_ROLE, type BidColumnMapping, type BidRow } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { MapBidColumnsDialog } from './map-bid-columns-dialog'

const HEADERS = ['Models', 'Serial', 'Mileage', 'Brand']
const ROWS = [{ cells: ['C3000', 'S1', '120000', 'Canon'] } as BidRow]

function renderDialog(
  columnMappings: BidColumnMapping[] = [],
  onSave = vi.fn().mockResolvedValue(undefined),
) {
  render(
    <MapBidColumnsDialog
      bid={{ headers: HEADERS, rows: ROWS, column_mappings: columnMappings }}
      onSave={onSave}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Map Columns' }))
  return onSave
}

function openTypes(header: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: `Type of ${header}` }), { key: 'Enter' })
  return screen.getByRole('listbox')
}

function pickType(header: string, typeLabel: string) {
  fireEvent.click(within(openTypes(header)).getByRole('option', { name: typeLabel }))
}

function optionLabels(header: string): string[] {
  const labels = within(openTypes(header))
    .getAllByRole('option')
    .map((option) => option.textContent ?? '')
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
  return labels
}

describe('MapBidColumnsDialog', () => {
  it('lists automatically recognised columns locked, with no dropdown', () => {
    renderDialog()
    expect(screen.queryByRole('combobox', { name: 'Type of Models' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Type of Mileage' })).toBeInTheDocument()
  })

  it('offers only the types nobody has taken', () => {
    renderDialog()
    pickType('Mileage', 'Total Meter')
    expect(optionLabels('Brand')).toEqual(['Brand', 'Accessories', 'Notes'])
  })

  it('offers a cleared type again', () => {
    renderDialog()
    pickType('Mileage', 'Total Meter')
    fireEvent.click(screen.getByRole('button', { name: 'Clear Mileage mapping' }))
    expect(optionLabels('Brand')).toContain('Total Meter')
  })

  it('shows the success bar once Model, Serial # and Total Meter are mapped', () => {
    renderDialog()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    pickType('Mileage', 'Total Meter')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Model, Serial # and Total Meter are mapped.',
    )
  })

  it('saves the chosen mappings', () => {
    const onSave = renderDialog()
    pickType('Mileage', 'Total Meter')
    pickType('Brand', 'Brand')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith([
      { column_index: 2, role: BID_COLUMN_ROLE.TOTAL_METER },
      { column_index: 3, role: BID_COLUMN_ROLE.BRAND },
    ])
  })

  it('asks before discarding changes on Cancel', () => {
    renderDialog([{ column_index: 3, role: BID_COLUMN_ROLE.BRAND }])
    pickType('Mileage', 'Total Meter')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
