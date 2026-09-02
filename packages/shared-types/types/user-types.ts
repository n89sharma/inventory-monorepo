import { z } from 'zod'

export const SetRoleSchema = z.object({
  role: z.string(),
})
export type SetRole = z.infer<typeof SetRoleSchema>

export const UserSchema = z.object({
  id: z.int(),
  name: z.string(),
  email: z.string().nullable(),
  is_active: z.boolean(),
  role: z.string().nullable(),
  clerk_id: z.string().nullable(),
  default_warehouse_id: z.int().nullable(),
})

export type User = z.infer<typeof UserSchema>

export const ToggleActiveSchema = z.object({
  is_active: z.boolean(),
})
export type ToggleActive = z.infer<typeof ToggleActiveSchema>
