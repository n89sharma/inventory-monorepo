import { describe, expect, it, vi } from 'vitest'
import {
  createPriceCellEditorRegistry,
  editablePriceFieldForColumn,
  resolveAdjacentPriceCell,
  type EditablePriceField,
  type PriceCellDirection,
  type PriceCellPosition,
  type PriceGridLayout,
} from './price-cell-navigation'

const INVOICE_FIELDS: EditablePriceField[] = [
  'purchase_cost',
  'transport_cost',
  'processing_cost',
  'sale_price',
]

const LAYOUT: PriceGridLayout = {
  rowIds: ['BC-1', 'BC-2', 'BC-3'],
  fields: INVOICE_FIELDS,
}

const SINGLE_CELL_LAYOUT: PriceGridLayout = {
  rowIds: ['BC-1'],
  fields: ['purchase_cost'],
}

describe('editablePriceFieldForColumn', () => {
  it('maps an editable cost column to the field the API patches', () => {
    expect(editablePriceFieldForColumn('cost_purchase_cost')).toBe('purchase_cost')
    expect(editablePriceFieldForColumn('cost_transport_cost')).toBe('transport_cost')
    expect(editablePriceFieldForColumn('cost_sale_price')).toBe('sale_price')
  })

  it('rejects the server-derived columns', () => {
    expect(editablePriceFieldForColumn('cost_total_cost')).toBeUndefined()
    expect(editablePriceFieldForColumn('cost_parts_cost')).toBeUndefined()
  })

  it('rejects a column id that is not a cost column at all', () => {
    expect(editablePriceFieldForColumn('barcode')).toBeUndefined()
  })

  it('rejects a bare API field name, which is not a column id', () => {
    expect(editablePriceFieldForColumn('purchase_cost')).toBeUndefined()
  })
})

describe('resolveAdjacentPriceCell', () => {
  const cases: ReadonlyArray<{
    name: string
    layout?: PriceGridLayout
    origin: PriceCellPosition
    direction: PriceCellDirection
    expected: PriceCellPosition | null
  }> = [
    {
      name: 'moves to the next field in the same row',
      origin: { rowId: 'BC-2', field: 'purchase_cost' },
      direction: 'nextField',
      expected: { rowId: 'BC-2', field: 'transport_cost' },
    },
    {
      name: 'skips total_cost because it is absent from the layout fields',
      origin: { rowId: 'BC-2', field: 'processing_cost' },
      direction: 'nextField',
      expected: { rowId: 'BC-2', field: 'sale_price' },
    },
    {
      name: 'wraps past the last field to the next row leftmost field',
      origin: { rowId: 'BC-1', field: 'sale_price' },
      direction: 'nextField',
      expected: { rowId: 'BC-2', field: 'purchase_cost' },
    },
    {
      name: 'returns null past the last field of the last row',
      origin: { rowId: 'BC-3', field: 'sale_price' },
      direction: 'nextField',
      expected: null,
    },
    {
      name: 'moves to the previous field in the same row',
      origin: { rowId: 'BC-2', field: 'transport_cost' },
      direction: 'previousField',
      expected: { rowId: 'BC-2', field: 'purchase_cost' },
    },
    {
      name: 'wraps before the first field to the previous row rightmost field',
      origin: { rowId: 'BC-2', field: 'purchase_cost' },
      direction: 'previousField',
      expected: { rowId: 'BC-1', field: 'sale_price' },
    },
    {
      name: 'returns null before the first field of the first row',
      origin: { rowId: 'BC-1', field: 'purchase_cost' },
      direction: 'previousField',
      expected: null,
    },
    {
      name: 'moves down a row keeping the field',
      origin: { rowId: 'BC-2', field: 'processing_cost' },
      direction: 'nextRow',
      expected: { rowId: 'BC-3', field: 'processing_cost' },
    },
    {
      name: 'returns null below the last row',
      origin: { rowId: 'BC-3', field: 'processing_cost' },
      direction: 'nextRow',
      expected: null,
    },
    {
      name: 'returns null when the origin row left the layout',
      origin: { rowId: 'BC-9', field: 'purchase_cost' },
      direction: 'nextField',
      expected: null,
    },
    {
      name: 'returns null when the origin field is hidden by permission',
      origin: { rowId: 'BC-1', field: 'sale_price' },
      direction: 'previousField',
      layout: { rowIds: LAYOUT.rowIds, fields: ['purchase_cost', 'transport_cost'] },
      expected: null,
    },
    {
      name: 'returns null in every direction from the only cell in the grid',
      origin: { rowId: 'BC-1', field: 'purchase_cost' },
      direction: 'nextField',
      layout: SINGLE_CELL_LAYOUT,
      expected: null,
    },
    {
      name: 'returns null moving down from the only row in the grid',
      origin: { rowId: 'BC-1', field: 'purchase_cost' },
      direction: 'nextRow',
      layout: SINGLE_CELL_LAYOUT,
      expected: null,
    },
  ]

  it.each(cases)('$name', ({ layout = LAYOUT, origin, direction, expected }) => {
    expect(resolveAdjacentPriceCell(layout, origin, direction)).toEqual(expected)
  })

  it('traverses the whole grid without repeating a cell', () => {
    const visited: string[] = []
    let position: PriceCellPosition | null = { rowId: 'BC-1', field: 'purchase_cost' }
    while (position) {
      visited.push(`${position.rowId}:${position.field}`)
      position = resolveAdjacentPriceCell(LAYOUT, position, 'nextField')
    }

    expect(visited).toHaveLength(LAYOUT.rowIds.length * INVOICE_FIELDS.length)
    expect(new Set(visited).size).toBe(visited.length)
    expect(visited[visited.length - 1]).toBe('BC-3:sale_price')
  })
})

describe('createPriceCellEditorRegistry', () => {
  const POSITION: PriceCellPosition = { rowId: 'BC-1', field: 'purchase_cost' }

  it('calls the editor registered for the position', () => {
    const registry = createPriceCellEditorRegistry()
    const beginEditing = vi.fn()
    registry.register(POSITION, beginEditing)

    registry.beginEditing(POSITION)

    expect(beginEditing).toHaveBeenCalledOnce()
  })

  it('ignores a position with no registered editor', () => {
    const registry = createPriceCellEditorRegistry()
    const beginEditing = vi.fn()
    registry.register(POSITION, beginEditing)

    registry.beginEditing({ rowId: 'BC-2', field: 'purchase_cost' })
    registry.beginEditing({ rowId: 'BC-1', field: 'sale_price' })

    expect(beginEditing).not.toHaveBeenCalled()
  })

  it('stops calling an editor after it unregisters', () => {
    const registry = createPriceCellEditorRegistry()
    const beginEditing = vi.fn()
    const unregister = registry.register(POSITION, beginEditing)

    unregister()
    registry.beginEditing(POSITION)

    expect(beginEditing).not.toHaveBeenCalled()
  })

  it('keeps the newer editor when a stale cleanup runs after a remount', () => {
    const registry = createPriceCellEditorRegistry()
    const staleEditor = vi.fn()
    const freshEditor = vi.fn()
    const unregisterStale = registry.register(POSITION, staleEditor)
    registry.register(POSITION, freshEditor)

    unregisterStale()
    registry.beginEditing(POSITION)

    expect(staleEditor).not.toHaveBeenCalled()
    expect(freshEditor).toHaveBeenCalledOnce()
  })
})
