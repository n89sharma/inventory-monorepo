import type { AssetDetails, AssetSummary } from '../types/asset-types.js'

export function assetDetailsToSummary(assetDetails: AssetDetails): AssetSummary {
  return {
    id: assetDetails.id,
    barcode: assetDetails.barcode,
    brand: assetDetails.brand,
    model: assetDetails.model,
    asset_type: assetDetails.asset_type,
    serial_number: assetDetails.serial_number,
    meter_total: assetDetails.specs.meter_total,
    weight: assetDetails.weight,
    size: assetDetails.size,
    status: assetDetails.status,
    readiness: assetDetails.readiness,
    location: assetDetails.location,
    hold_number: assetDetails.hold?.hold_number,
    purchase_invoice_number: assetDetails.purchase_invoice?.invoice_number ?? null,
    is_in_transit: assetDetails.is_in_transit,
  }
}
