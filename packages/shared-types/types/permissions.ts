import { type AppRole } from './user-types.js'

export type Permission =
  | 'manage_users'
  | 'assign_roles'
  | 'manage_settings'
  | 'view_asset'
  | 'view_sale_price'
  | 'view_purchase_price'
  | 'edit_tech_specs'
  | 'edit_location'
  | 'edit_serial_number'
  | 'edit_prices'
  | 'create_asset'
  | 'delete_asset'
  | 'view_collections'
  | 'view_reports'
  | 'create_update_hold'
  | 'create_update_arrival'
  | 'create_update_transfer'
  | 'create_update_departure'
  | 'create_update_invoice'
  | 'delete_collection'

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    'manage_users',
    'assign_roles',
    'manage_settings',
    'view_asset',
    'view_sale_price',
    'view_purchase_price',
    'edit_tech_specs',
    'edit_location',
    'edit_serial_number',
    'edit_prices',
    'create_asset',
    'delete_asset',
    'view_collections',
    'view_reports',
    'create_update_hold',
    'create_update_arrival',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
    'delete_collection',
  ],
  general_manager: [
    'view_asset',
    'view_sale_price',
    'view_purchase_price',
    'edit_tech_specs',
    'edit_location',
    'edit_serial_number',
    'edit_prices',
    'create_asset',
    'view_collections',
    'view_reports',
    'create_update_hold',
    'create_update_arrival',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
  ],
  inventory_manager: [
    'manage_settings',
    'view_asset',
    'view_sale_price',
    'view_purchase_price',
    'edit_tech_specs',
    'edit_location',
    'edit_serial_number',
    'edit_prices',
    'create_asset',
    'view_collections',
    'view_reports',
    'create_update_hold',
    'create_update_arrival',
    'create_update_transfer',
    'create_update_departure',
    'create_update_invoice',
  ],
  accountant: [
    'view_asset',
    'view_sale_price',
    'view_purchase_price',
    'view_collections',
  ],
  tech: [
    'view_asset',
    'edit_tech_specs',
    'view_collections',
  ],
  senior_sales: [
    'view_asset',
    'view_sale_price',
    'view_collections',
    'create_update_hold',
  ],
  sales: [
    'view_asset',
    'view_collections',
    'create_update_hold',
  ],
  sales_assistant: [
    'view_asset',
    'view_collections',
    'create_update_hold',
  ],
  shipping: [
    'view_asset',
    'edit_location',
    'view_collections',
    'create_update_arrival',
    'create_update_transfer',
    'create_update_departure'
  ],
  picker: [
    'view_asset',
    'edit_location',
    'view_collections',
  ],
  member: [
    'view_asset',
    'view_collections',
  ],
}

