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
    availability_status: assetDetails.availability_status,
    tracking_status: assetDetails.tracking_status,
    technical_status: assetDetails.technical_status,
    warehouse_city_code: assetDetails.warehouse_code,
    warehouse_street: assetDetails.warehouse_street,
    is_held: assetDetails.is_held,
    purchase_invoice_id: null,
  }
}
