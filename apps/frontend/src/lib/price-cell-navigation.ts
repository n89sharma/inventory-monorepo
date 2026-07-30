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
