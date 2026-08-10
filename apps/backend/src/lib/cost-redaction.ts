import { type AssetCost, type AssetSearchRow, type AppRole, ROLE_PERMISSIONS } from 'shared-types'

export function redactSearchRowCost(row: AssetSearchRow, role: AppRole | null): AssetSearchRow {
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const canViewPurchase = permissions.includes('view_purchase_price')
  const canViewSale = permissions.includes('view_sale_price')
  return {
    ...row,
    cost_purchase_cost: canViewPurchase ? row.cost_purchase_cost : null,
    cost_transport_cost: canViewPurchase ? row.cost_transport_cost : null,
    cost_processing_cost: canViewPurchase ? row.cost_processing_cost : null,
    cost_other_cost: canViewPurchase ? row.cost_other_cost : null,
    cost_parts_cost: canViewPurchase ? row.cost_parts_cost : null,
    cost_total_cost: canViewPurchase ? row.cost_total_cost : null,
    cost_sale_price: canViewSale ? row.cost_sale_price : null,
  }
}

export function redactAssetCost(cost: AssetCost | null, role: AppRole | null): AssetCost | null {
  if (cost === null) return null
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const canViewPurchase = permissions.includes('view_purchase_price')
  const canViewSale = permissions.includes('view_sale_price')
  return {
    purchase_cost: canViewPurchase ? cost.purchase_cost : null,
    transport_cost: canViewPurchase ? cost.transport_cost : null,
    processing_cost: canViewPurchase ? cost.processing_cost : null,
    other_cost: canViewPurchase ? cost.other_cost : null,
    parts_cost: canViewPurchase ? cost.parts_cost : null,
    total_cost: canViewPurchase ? cost.total_cost : null,
    sale_price: canViewSale ? cost.sale_price : null,
  }
}
