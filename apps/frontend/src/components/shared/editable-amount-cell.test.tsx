import { createPriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Row, Table } from '@tanstack/react-table'
import { describe, expect, it, vi } from 'vitest'
import { EditableAmountCell } from './editable-amount-cell'

type Line = { id: string }

const ROW_ID = 'row-1'
const FIELD = 'freight'
const LABEL = 'Freight for row 1'

function fieldForColumn(columnId: string): typeof FIELD | undefined {
  return columnId === FIELD ? FIELD : undefined
}

function renderCell(
  onSave: (value: number | null) => Promise<void>,
  value: number | null,
  blankValue: 0 | null,
) {
  const table = {
    getRowModel: () => ({ rows: [{ id: ROW_ID }] }),
    getVisibleLeafColumns: () => [{ id: FIELD }],
  } as unknown as Table<Line>
  render(
    <EditableAmountCell
      row={{ id: ROW_ID, original: { id: ROW_ID } } as Row<Line>}
      table={table}
      field={FIELD}
      value={value}
      blankValue={blankValue}
      label={LABEL}
      editorRegistry={createPriceCellEditorRegistry<typeof FIELD>()}
      fieldForColumn={fieldForColumn}
      onSave={onSave}
    />,
  )
}

function openEditor(): HTMLInputElement {
  fireEvent.click(screen.getByLabelText(LABEL))
  const input = screen.getByLabelText(LABEL)
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected an amount input')
  return input
}

describe('EditableAmountCell', () => {
  it('shows an unset amount as blank', () => {
    renderCell(vi.fn(), null, null)
    expect(screen.getByLabelText(LABEL)).toHaveTextContent('')
  })

  it('saves the typed amount through the callback it is given', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderCell(onSave, null, null)
    const input = openEditor()
    fireEvent.change(input, { target: { value: '125.5' } })
    fireEvent.blur(input)
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(125.5))
  })

  it('commits a cleared box as the blank value', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderCell(onSave, 40, null)
    const input = openEditor()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null))
  })

  it('does not save an unset amount left blank', () => {
    const onSave = vi.fn()
    renderCell(onSave, null, null)
    fireEvent.blur(openEditor())
    expect(onSave).not.toHaveBeenCalled()
  })
})
