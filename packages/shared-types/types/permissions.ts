import { z } from 'zod'

// The permission vocabulary is code, not data: every key here is named by a route guard,
// a useCan call or a column definition. The Permission table mirrors this list.
export const PERMISSIONS = [
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
  'return_to_stock',
  'view_sale_price',
  'view_purchase_price',
  'edit_any_hold',
  'edit_prices',
  'view_profitability_report',
  'update_users',
  'update_user_roles',
  'delete_asset',
  'delete_collection',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const PermissionSchema = z.enum(PERMISSIONS)
