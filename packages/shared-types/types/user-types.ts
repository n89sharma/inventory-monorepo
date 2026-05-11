import { z } from 'zod';

export const AppRoles = [
  'admin',
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

export type AppRole = typeof AppRoles[number]

export const SetRoleSchema = z.object({
  role: z.enum(AppRoles),
})

export const UserSchema = z.object({
  id: z.int(),
  name: z.string(),
  email: z.string().nullable(),
  is_active: z.boolean(),
  role: z.enum(AppRoles).nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const ToggleActiveSchema = z.object({
  is_active: z.boolean(),
})
