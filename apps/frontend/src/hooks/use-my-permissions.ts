import { getMyPermissions } from '@/data/api/role-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import { useAuth } from '@clerk/react'
import type { MyPermissions } from 'shared-types'
import useSWR, { mutate } from 'swr'

const MY_PERMISSIONS_KEY = 'my-permissions'
const NO_PERMISSIONS: MyPermissions = []

// Clerk reports isLoaded false on the first render, so this key stays null through the render
// pass whose effects register the Authorization interceptor. Without the gate the first request
// leaves unauthenticated and the 401 costs SWR's 5s error backoff before anything recovers.
function useMyPermissionsQuery() {
  const { isLoaded, isSignedIn } = useAuth()
  const key = isLoaded && isSignedIn ? MY_PERMISSIONS_KEY : null
  return useSWR(key, getMyPermissions, CATALOG_DATA_OPTIONS)
}

export function useMyPermissions(): MyPermissions {
  return useMyPermissionsQuery().data ?? NO_PERMISSIONS
}

// `failed` and `loaded` are both false while the first read is in flight. They are separate so
// the shell can hold for a pending read but say something for a read that is not coming back.
export function useMyPermissionsState(): { loaded: boolean; failed: boolean } {
  const { data, error } = useMyPermissionsQuery()
  return { loaded: data !== undefined, failed: data === undefined && error !== undefined }
}

export function invalidateMyPermissions() {
  return mutate(MY_PERMISSIONS_KEY)
}
