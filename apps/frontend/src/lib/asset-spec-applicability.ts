const METER_ASSET_TYPES = ['COPIER', 'ACCESSORY', 'SCANNER', 'PLOTTER', 'PRINTER', 'FAX']
const CASSETTE_ASSET_TYPES = ['COPIER', 'ACCESSORY', 'PRINTER', 'WAREHOUSE_SUPPLIES', 'FAX']
const MANUFACTURING_ORIGIN_ASSET_TYPES = ['COPIER']

export type SpecApplicability = {
  meter: boolean
  cassettes: boolean
  internalFinisher: boolean
  consumables: boolean
  manufacturingOrigin: boolean
}

export function specApplicability(assetType: string | null): SpecApplicability {
  const type = assetType?.toUpperCase() ?? null
  if (type == null) {
    return {
      meter: true,
      cassettes: true,
      internalFinisher: true,
      consumables: true,
      manufacturingOrigin: true,
    }
  }
  const hasCassetteGroup = CASSETTE_ASSET_TYPES.includes(type)
  return {
    meter: METER_ASSET_TYPES.includes(type),
    cassettes: hasCassetteGroup,
    internalFinisher: hasCassetteGroup,
    consumables: hasCassetteGroup,
    manufacturingOrigin: MANUFACTURING_ORIGIN_ASSET_TYPES.includes(type),
  }
}
