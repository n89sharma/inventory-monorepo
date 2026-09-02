import { PERMISSIONS } from 'shared-types'
import { afterEach, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createRole,
  deleteRole,
  getDefaultRoleCode,
  getPermissionsForRole,
  listRoles,
  renameRole,
  setRolePermissions,
} from './roleService.js'

const SEEDED_ROLE_CODES = [
  'accountant',
  'admin',
  'branch_manager',
  'general_manager',
  'inventory_manager',
  'leadership',
  'member',
  'picker',
  'sales',
  'sales_assistant',
  'senior_accountant',
  'senior_sales',
  'shipping',
  'tech',
]

const ROLES_WITH_RETURN_TO_STOCK = ['admin', 'general_manager', 'inventory_manager', 'leadership']

describe('roleService', () => {
  it('seeds the roles the ROLE_PERMISSIONS constant used to define', async () => {
    const roles = await listRoles()
    expect(roles.map((r) => r.code).sort()).toEqual(SEEDED_ROLE_CODES)
  })

  it('grants the system role every permission', async () => {
    const roles = await listRoles()
    const systemRoles = roles.filter((r) => r.is_system)
    expect(systemRoles.map((r) => r.code)).toEqual(['admin'])
    expect(systemRoles[0]!.permissions.sort()).toEqual([...PERMISSIONS].sort())
  })

  it('marks exactly one role as the default for new users', async () => {
    const roles = await listRoles()
    expect(roles.filter((r) => r.is_default).map((r) => r.code)).toEqual(['member'])
    expect(await getDefaultRoleCode()).toBe('member')
  })

  it('grants return_to_stock to exactly the four intended roles', async () => {
    const roles = await listRoles()
    const granted = roles
      .filter((r) => r.permissions.includes('return_to_stock'))
      .map((r) => r.code)
    expect(granted.sort()).toEqual(ROLES_WITH_RETURN_TO_STOCK)
  })

  it('resolves a role code to its granted permissions', async () => {
    const permissions = await getPermissionsForRole('sales')
    expect(permissions.has('view_sale_price')).toBe(true)
    expect(permissions.has('view_purchase_price')).toBe(false)
  })

  it('grants nothing for a role code that does not exist', async () => {
    const permissions = await getPermissionsForRole('no_such_role')
    expect(permissions.size).toBe(0)
  })

  describe('editing roles', () => {
    const NAME = 'Warehouse Lead'
    const CODE = 'warehouse_lead'

    afterEach(async () => {
      await prisma.user.updateMany({ where: { role: CODE }, data: { role: null } })
      await prisma.role.deleteMany({ where: { code: CODE } })
    })

    it('derives an immutable code from the name and keeps the grants given', async () => {
      const role = await createRole({ name: NAME, permissions: ['view_asset', 'update_location'] })

      expect(role.code).toBe(CODE)
      expect(role.permissions.sort()).toEqual(['update_location', 'view_asset'])
      expect([...(await getPermissionsForRole(CODE))].sort()).toEqual([
        'update_location',
        'view_asset',
      ])
    })

    it('leaves the code alone when the name changes', async () => {
      await createRole({ name: NAME, permissions: [] })
      await renameRole(CODE, 'Warehouse Supervisor')

      const roles = await listRoles()
      expect(roles.find((r) => r.code === CODE)?.name).toBe('Warehouse Supervisor')
    })

    it('serves the new grants immediately after a matrix edit', async () => {
      await createRole({ name: NAME, permissions: ['view_asset'] })
      expect((await getPermissionsForRole(CODE)).has('edit_prices')).toBe(false)

      await setRolePermissions(CODE, ['view_asset', 'edit_prices'])
      expect((await getPermissionsForRole(CODE)).has('edit_prices')).toBe(true)
    })

    it('refuses to delete a role that users still hold', async () => {
      await createRole({ name: NAME, permissions: [] })
      const user = await prisma.user.create({
        data: { name: 'role-test:holder', is_active: true, role: CODE },
      })

      await expect(deleteRole(CODE)).rejects.toBeInstanceOf(ConflictError)

      await prisma.user.delete({ where: { id: user.id } })
      await expect(deleteRole(CODE)).resolves.toBeUndefined()
    })

    it('refuses to rename, regrant or delete the system role', async () => {
      await expect(renameRole('admin', 'Root')).rejects.toBeInstanceOf(ConflictError)
      await expect(setRolePermissions('admin', [])).rejects.toBeInstanceOf(ConflictError)
      await expect(deleteRole('admin')).rejects.toBeInstanceOf(ConflictError)
      expect([...(await getPermissionsForRole('admin'))].sort()).toEqual([...PERMISSIONS].sort())
    })

    it('refuses to delete the default role for new users', async () => {
      await expect(deleteRole('member')).rejects.toBeInstanceOf(ConflictError)
    })

    it('rejects a name already taken by another role', async () => {
      await expect(createRole({ name: 'Sales', permissions: [] })).rejects.toBeInstanceOf(
        ConflictError,
      )
    })

    it('reports a missing role rather than silently succeeding', async () => {
      await expect(renameRole('no_such_role', NAME)).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
