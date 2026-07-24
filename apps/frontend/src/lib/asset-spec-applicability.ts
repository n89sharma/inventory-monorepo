const SPECIFICATION_FIELD_GROUPS = [
  'meter',
  'cassettes',
  'internalFinisher',
  'consumables',
  'coreFunctions',
  'manufacturingOrigin',
] as const
type SpecificationFieldGroups = (typeof SPECIFICATION_FIELD_GROUPS)[number]

const ASSET_TYPE_SPECIFICATION_FIELD_GROUPS = {
  COPIER: [
    'meter',
    'cassettes',
    'internalFinisher',
    'consumables',
    'coreFunctions',
    'manufacturingOrigin',
  ],
  PRINTER: ['meter', 'cassettes', 'internalFinisher', 'consumables', 'coreFunctions'],
  FAX: ['meter', 'cassettes', 'coreFunctions'],
  ACCESSORY: ['meter'],
  SCANNER: ['meter', 'coreFunctions'],
  PLOTTER: ['meter', 'coreFunctions'],
  WAREHOUSE_SUPPLIES: [],
} as const satisfies Record<string, SpecificationFieldGroups[]>

export type SpecificationFieldVisibility = Record<SpecificationFieldGroups, boolean>

function getSpecificationFieldsForType(
  assetType: string | null,
): readonly SpecificationFieldGroups[] {
  const type = assetType?.toUpperCase() ?? null
  if (type == null) return SPECIFICATION_FIELD_GROUPS
  if (type in ASSET_TYPE_SPECIFICATION_FIELD_GROUPS) {
    return ASSET_TYPE_SPECIFICATION_FIELD_GROUPS[
      type as keyof typeof ASSET_TYPE_SPECIFICATION_FIELD_GROUPS
    ]
  }
  return []
}

export function getSpecificationFieldVisibility(
  assetType: string | null,
): SpecificationFieldVisibility {
  const fields = getSpecificationFieldsForType(assetType)
  return {
    meter: fields.includes('meter'),
    cassettes: fields.includes('cassettes'),
    internalFinisher: fields.includes('internalFinisher'),
    consumables: fields.includes('consumables'),
    coreFunctions: fields.includes('coreFunctions'),
    manufacturingOrigin: fields.includes('manufacturingOrigin'),
  }
}
