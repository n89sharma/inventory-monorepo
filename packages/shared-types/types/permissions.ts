import { type AppRole } from './user-types.js'

export type Permission =
  | 'view_asset'
  | 'view_collections'
  | 'view_reports'
  | 'view_store'
  | 'create_update_arrival'
  | 'create_update_hold'
  | 'create_update_transfer'
  | 'create_update_departure'
  | 'create_update_invoice'
  | 'create_update_store'
  | 'update_tech_specs'
  | 'update_location'
  | 'update_settings'
  | 'view_sale_price'
  | 'view_purchase_price'
  | 'edit_any_hold'
  | 'edit_prices'
  | 'view_profitability_report'
  | 'update_users'
  | 'update_user_roles'
  | 'delete_asset'
  | 'delete_collection'

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    'view_asset',
    'view_collections',
    'view_reports',
    'view_store',
    'create_update_arrival',
    'create_update_hold',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'create_update_store',
    'update_tech_specs',
    'update_location',
    'update_settings',
    'view_sale_price',
    'view_purchase_price',
    'edit_any_hold',
    'edit_prices',
    'view_profitability_report',
    'update_users',
    'update_user_roles',
    'delete_asset',
    'delete_collection',
  ],
  leadership: [
    'view_asset',
    'view_collections',
    'view_reports',
    'view_store',
    'create_update_arrival',
    'create_update_hold',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'create_update_store',
    'update_tech_specs',
    'update_location',
    'view_sale_price',
    'view_purchase_price',
    'edit_any_hold',
    'edit_prices',
    'view_profitability_report',
  ],
  general_manager: [
    'view_asset',
    'view_collections',
    'view_reports',
    'view_store',
    'create_update_arrival',
    'create_update_hold',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'create_update_store',
    'update_tech_specs',
    'update_location',
    'view_sale_price',
    'view_purchase_price',
    'edit_any_hold',
    'edit_prices',
  ],
  inventory_manager: [
    'view_asset',
    'view_collections',
    'view_reports',
    'view_store',
    'create_update_arrival',
    'create_update_hold',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'create_update_store',
    'update_tech_specs',
    'update_location',
    'update_settings',
    'view_sale_price',
    'view_purchase_price',
    'edit_prices',
  ],
  branch_manager: [
    'view_asset',
    'view_collections',
    'view_reports',
    'view_store',
    'create_update_arrival',
    'create_update_hold',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'create_update_store',
    'update_tech_specs',
    'update_location',
    'view_sale_price',
    'view_purchase_price',
  ],
  senior_sales: [
    'view_asset',
    'view_collections',
    'view_reports',
    'create_update_hold',
    'view_sale_price',
    'view_purchase_price',
  ],
  sales: [
    'view_asset',
    'view_collections',
    'view_reports',
    'create_update_hold',
    'view_sale_price',
  ],
  shipping: [
    'view_asset',
    'view_collections',
    'view_store',
    'create_update_arrival',
    'create_update_transfer',
    'create_update_departure',
    'create_update_store',
    'update_tech_specs',
    'update_location',
  ],
  senior_accountant: [
    'view_asset',
    'view_collections',
    'create_update_arrival',
    'create_update_hold',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'view_sale_price',
    'view_purchase_price',
    'edit_prices',
  ],
  accountant: [
    'view_asset',
    'view_collections',
    'view_sale_price',
    'create_update_invoice',
    'view_purchase_price',
    'edit_prices',
  ],
  tech: [
    'view_asset',
    'view_collections',
    'view_store',
    'create_update_store',
    'update_tech_specs',
    'update_location',
  ],
  sales_assistant: ['view_asset', 'view_collections', 'create_update_hold'],
  picker: ['view_asset', 'view_collections', 'update_location'],
  member: ['view_asset', 'view_collections'],
}
