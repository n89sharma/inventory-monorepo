import { LRUCache } from 'lru-cache'
import { PERMISSIONS, type CreateRole, type Permission, type Role } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
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

// The code is what User.role and Clerk publicMetadata store, so it is derived once at creation
// and never rewritten; the name is the label and stays editable.
function toRoleCode(name: string): string {
  const code = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('_')
  if (!code) throw new ValidationError('A role name must contain a letter or a number')
  return code
}

async function findEditableRole(tx: Prisma.TransactionClient, code: string) {
  const role = await tx.role.findUnique({
    where: { code },
    select: { name: true, is_system: true, is_default: true },
  })
  if (!role) throw new NotFoundError(`Role ${code} not found`)
  if (role.is_system) throw new ConflictError(`${role.name} is a system role and cannot be changed`)
  return role
}

async function assertRoleNameAvailable(
  tx: Prisma.TransactionClient,
  name: string,
  excludeCode: string | null,
): Promise<void> {
  const taken = await tx.role.findFirst({
    where: { name, NOT: excludeCode ? { code: excludeCode } : undefined },
    select: { code: true },
  })
  if (taken) throw new ConflictError(`A role named ${name} already exists`)
}

function toGrantRows(code: string, permissions: Permission[]) {
  return [...toPermissionSet(permissions)].map((permission) => ({
    role_code: code,
    permission_key: permission,
  }))
}

export async function createRole({ name, permissions }: CreateRole): Promise<Role> {
  const code = toRoleCode(name)
  const role = await prisma.$transaction(async (tx) => {
    if (await tx.role.findUnique({ where: { code }, select: { code: true } })) {
      throw new ConflictError(`A role named ${name} already exists`)
    }
    await assertRoleNameAvailable(tx, name, null)
    await tx.role.create({ data: { code, name } })
    await tx.rolePermission.createMany({ data: toGrantRows(code, permissions) })
    return { code, name, is_system: false, is_default: false }
  })
  invalidatePermissionCache()
  return { ...role, permissions: [...toPermissionSet(permissions)] }
}

export async function renameRole(code: string, name: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await findEditableRole(tx, code)
    await assertRoleNameAvailable(tx, name, code)
    await tx.role.update({ where: { code }, data: { name } })
  })
}

export async function setRolePermissions(code: string, permissions: Permission[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await findEditableRole(tx, code)
    await tx.rolePermission.deleteMany({ where: { role_code: code } })
    await tx.rolePermission.createMany({ data: toGrantRows(code, permissions) })
  })
  invalidatePermissionCache()
}

export async function deleteRole(code: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const role = await findEditableRole(tx, code)
    if (role.is_default) {
      throw new ConflictError(
        `${role.name} is the default role for new users and cannot be deleted`,
      )
    }
    const assigned = await tx.user.count({ where: { role: code } })
    if (assigned > 0) {
      throw new ConflictError(
        `${role.name} is assigned to ${assigned} user${assigned === 1 ? '' : 's'}. Reassign them first.`,
      )
    }
    await tx.role.delete({ where: { code } })
  })
  invalidatePermissionCache()
}

function invalidatePermissionCache(): void {
  permissionCache.clear()
}
