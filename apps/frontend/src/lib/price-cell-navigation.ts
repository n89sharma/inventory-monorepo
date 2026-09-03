export const EDITABLE_PRICE_FIELDS = [
  'purchase_cost',
  'transport_cost',
  'transfer_cost',
  'processing_cost',
  'other_cost',
  'sale_price',
] as const

export type EditablePriceField = (typeof EDITABLE_PRICE_FIELDS)[number]

export const EDITABLE_PRICE_COLUMNS = {
  cost_purchase_cost: 'purchase_cost',
  cost_transport_cost: 'transport_cost',
  cost_transfer_cost: 'transfer_cost',
  cost_processing_cost: 'processing_cost',
  cost_sale_price: 'sale_price',
} as const satisfies Record<string, EditablePriceField>

export type EditablePriceColumnId = keyof typeof EDITABLE_PRICE_COLUMNS

const FIELD_BY_COLUMN_ID: ReadonlyMap<string, EditablePriceField> = new Map(
  Object.entries(EDITABLE_PRICE_COLUMNS),
)

export function editablePriceFieldForColumn(columnId: string): EditablePriceField | undefined {
  return FIELD_BY_COLUMN_ID.get(columnId)
}

export interface PriceCellPosition {
  rowId: string
  field: EditablePriceField
}

export interface PriceGridLayout {
  rowIds: readonly string[]
  fields: readonly EditablePriceField[]
}

export type PriceCellDirection = 'nextField' | 'previousField' | 'nextRow'

export function resolveAdjacentPriceCell(
  layout: PriceGridLayout,
  origin: PriceCellPosition,
  direction: PriceCellDirection,
): PriceCellPosition | null {
  const rowIndex = layout.rowIds.indexOf(origin.rowId)
  const fieldIndex = layout.fields.indexOf(origin.field)
  if (rowIndex === -1 || fieldIndex === -1) return null

  const previousRowId = layout.rowIds[rowIndex - 1]
  const nextRowId = layout.rowIds[rowIndex + 1]

  if (direction === 'nextRow') {
    if (nextRowId === undefined) return null
    return { rowId: nextRowId, field: origin.field }
  }

  if (direction === 'nextField') {
    const nextField = layout.fields[fieldIndex + 1]
    if (nextField !== undefined) return { rowId: origin.rowId, field: nextField }
    const firstField = layout.fields[0]
    if (nextRowId === undefined || firstField === undefined) return null
    return { rowId: nextRowId, field: firstField }
  }

  const previousField = layout.fields[fieldIndex - 1]
  if (previousField !== undefined) return { rowId: origin.rowId, field: previousField }
  const lastField = layout.fields[layout.fields.length - 1]
  if (previousRowId === undefined || lastField === undefined) return null
  return { rowId: previousRowId, field: lastField }
}

export interface PriceCellEditorRegistry {
  register(position: PriceCellPosition, beginEditing: () => void): () => void
  beginEditing(position: PriceCellPosition): void
}

export function createPriceCellEditorRegistry(): PriceCellEditorRegistry {
  const editors = new Map<string, () => void>()
  const keyOf = (position: PriceCellPosition) => `${position.rowId}:${position.field}`
  return {
    register(position, beginEditing) {
      const key = keyOf(position)
      editors.set(key, beginEditing)
      return () => {
        if (editors.get(key) === beginEditing) editors.delete(key)
      }
    },
    beginEditing(position) {
      editors.get(keyOf(position))?.()
    },
  }
}
