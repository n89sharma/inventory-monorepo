import type { AssetDetails, AssetSearchRow, AssetSummary } from '../types/asset-types.js'

export function searchRowToAssetSummary(row: AssetSearchRow): AssetSummary {
  return {
    id: row.id,
    barcode: row.barcode,
    brand: row.brand,
    model: row.model,
    asset_type: row.asset_type,
    serial_number: row.serial_number,
    meter_total: row.specs_meter_total,
    cassettes: row.specs_cassettes,
    internal_finisher: row.specs_internal_finisher,
    accessories: row.accessories,
    weight: row.weight,
    size: row.size,
    status: row.status,
    readiness: row.readiness,
    location: row.location,
    hold_number: row.hold_hold_number,
    purchase_invoice_number: row.purchase_invoice_invoice_number,
    sales_invoice_number: row.sales_invoice_invoice_number,
    is_in_transit: row.is_in_transit,
    created_at: row.created_at,
    cost: {
      purchase_cost: row.cost_purchase_cost,
      transport_cost: row.cost_transport_cost,
      transfer_cost: row.cost_transfer_cost,
      processing_cost: row.cost_processing_cost,
      other_cost: row.cost_other_cost,
      parts_cost: row.cost_parts_cost,
      total_cost: row.cost_total_cost,
      sale_price: row.cost_sale_price,
    },
  }
}

export function assetDetailsToSummary(
  assetDetails: AssetDetails,
  accessories: string[],
): AssetSummary {
  return {
    id: assetDetails.id,
    barcode: assetDetails.barcode,
    brand: assetDetails.brand,
    model: assetDetails.model,
    asset_type: assetDetails.asset_type,
    serial_number: assetDetails.serial_number,
    meter_total: assetDetails.specs.meter_total,
    cassettes: assetDetails.specs.cassettes,
    internal_finisher: assetDetails.specs.internal_finisher,
    accessories,
    weight: assetDetails.weight,
    size: assetDetails.size,
    status: assetDetails.status,
    readiness: assetDetails.readiness,
    location: assetDetails.location,
    hold_number: assetDetails.hold?.hold_number,
    purchase_invoice_number: assetDetails.purchase_invoice?.invoice_number ?? null,
    sales_invoice_number: assetDetails.sales_invoice?.invoice_number ?? null,
    is_in_transit: assetDetails.is_in_transit,
    created_at: assetDetails.created_at,
  }
}
