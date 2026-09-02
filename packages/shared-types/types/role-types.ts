import { z } from 'zod'
import { PermissionSchema } from './permissions.js'

const ROLE_NAME_MAX = 60

export const RoleSchema = z.object({
  code: z.string(),
  name: z.string(),
  is_system: z.boolean(),
  is_default: z.boolean(),
  permissions: z.array(PermissionSchema),
})
export type Role = z.infer<typeof RoleSchema>

export const CreateRoleSchema = z.object({
  name: z.string().trim().min(1).max(ROLE_NAME_MAX),
  permissions: z.array(PermissionSchema),
})
export type CreateRole = z.infer<typeof CreateRoleSchema>

export const UpdateRoleSchema = z.object({
  name: z.string().trim().min(1).max(ROLE_NAME_MAX),
})
export type UpdateRole = z.infer<typeof UpdateRoleSchema>

export const SetRolePermissionsSchema = z.object({
  permissions: z.array(PermissionSchema),
})
export type SetRolePermissions = z.infer<typeof SetRolePermissionsSchema>

export const MyPermissionsSchema = z.array(PermissionSchema)
export type MyPermissions = z.infer<typeof MyPermissionsSchema>
