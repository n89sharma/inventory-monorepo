import { getMyPermissions } from '@/data/api/role-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { MyPermissions } from 'shared-types'
import useSWR, { mutate } from 'swr'

const MY_PERMISSIONS_KEY = 'my-permissions'
const NO_PERMISSIONS: MyPermissions = []

function useMyPermissionsQuery() {
  return useSWR(MY_PERMISSIONS_KEY, getMyPermissions, CATALOG_DATA_OPTIONS)
}

export function useMyPermissions(): MyPermissions {
  return useMyPermissionsQuery().data ?? NO_PERMISSIONS
}

export function useMyPermissionsLoaded(): boolean {
  return useMyPermissionsQuery().data !== undefined
}

export function invalidateMyPermissions() {
  return mutate(MY_PERMISSIONS_KEY)
}
