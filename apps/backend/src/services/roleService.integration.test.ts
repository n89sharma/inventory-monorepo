import { PERMISSIONS } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { getDefaultRoleCode, getPermissionsForRole, listRoles } from './roleService.js'

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
})
