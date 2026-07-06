import { z } from 'zod'

export const AppRoles = [
  'admin',
  'leadership',
  'general_manager',
  'inventory_manager',
  'accountant',
  'tech',
  'senior_sales',
  'sales',
  'sales_assistant',
  'shipping',
  'picker',
  'member',
] as const

export type AppRole = (typeof AppRoles)[number]

export const SetRoleSchema = z.object({
  role: z.enum(AppRoles),
})
export type SetRole = z.infer<typeof SetRoleSchema>

export const UserSchema = z.object({
  id: z.int(),
  name: z.string(),
  email: z.string().nullable(),
  is_active: z.boolean(),
  role: z.enum(AppRoles).nullable(),
  clerk_id: z.string().nullable(),
  default_warehouse_id: z.int().nullable(),
})

export type User = z.infer<typeof UserSchema>

export const ToggleActiveSchema = z.object({
  is_active: z.boolean(),
})
export type ToggleActive = z.infer<typeof ToggleActiveSchema>
