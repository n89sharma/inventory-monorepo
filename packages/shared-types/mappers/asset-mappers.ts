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
    status: assetDetails.status,
    readiness: assetDetails.readiness,
    warehouse_city_code: assetDetails.warehouse_code,
    warehouse_street: assetDetails.warehouse_street,
    hold_number: assetDetails.hold?.hold_number,
    purchase_invoice_id: null,
  }
}
