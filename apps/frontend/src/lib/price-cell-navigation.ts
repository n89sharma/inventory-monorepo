const EDITABLE_PRICE_FIELDS = [
  'purchase_cost',
  'transport_cost',
  'processing_cost',
  'other_cost',
  'sale_price',
] as const

export type EditablePriceField = (typeof EDITABLE_PRICE_FIELDS)[number]

const EDITABLE_PRICE_FIELD_SET: ReadonlySet<string> = new Set<EditablePriceField>(
  EDITABLE_PRICE_FIELDS,
)

export function isEditablePriceField(field: string): field is EditablePriceField {
  return EDITABLE_PRICE_FIELD_SET.has(field)
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
