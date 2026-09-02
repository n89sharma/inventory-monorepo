import { LRUCache } from 'lru-cache'
import { PERMISSIONS, type Permission, type Role } from 'shared-types'
import { prisma } from '../prisma.js'

// role code -> granted permissions. Short-lived because a matrix edit served by one
// process must not stay invisible to another for long; the writing process clears it outright.
const PERMISSION_CACHE_MAX = 100
const PERMISSION_CACHE_TTL_MS = 1000 * 30
const permissionCache = new LRUCache<string, ReadonlySet<Permission>>({
  max: PERMISSION_CACHE_MAX,
  ttl: PERMISSION_CACHE_TTL_MS,
})

export const NO_PERMISSIONS: ReadonlySet<Permission> = new Set()

// Narrows the stored keys back onto the code-owned vocabulary without a cast: a key the
// running code no longer knows grants nothing.
function toPermissionSet(keys: string[]): ReadonlySet<Permission> {
  const granted = new Set<string>(keys)
  return new Set(PERMISSIONS.filter((permission) => granted.has(permission)))
}

export async function getPermissionsForRole(roleCode: string): Promise<ReadonlySet<Permission>> {
  const cached = permissionCache.get(roleCode)
  if (cached !== undefined) return cached

  const role = await prisma.role.findUnique({
    where: { code: roleCode },
    select: { permissions: { select: { permission_key: true } } },
  })
  const permissions = toPermissionSet(role?.permissions.map((p) => p.permission_key) ?? [])
  permissionCache.set(roleCode, permissions)
  return permissions
}

export async function listRoles(): Promise<Role[]> {
  const roles = await prisma.role.findMany({
    select: {
      code: true,
      name: true,
      is_system: true,
      is_default: true,
      permissions: { select: { permission_key: true } },
    },
    orderBy: { name: 'asc' },
  })
  return roles.map((role) => ({
    code: role.code,
    name: role.name,
    is_system: role.is_system,
    is_default: role.is_default,
    permissions: [...toPermissionSet(role.permissions.map((p) => p.permission_key))],
  }))
}

export async function getDefaultRoleCode(): Promise<string | null> {
  const role = await prisma.role.findFirst({ where: { is_default: true }, select: { code: true } })
  return role?.code ?? null
}
