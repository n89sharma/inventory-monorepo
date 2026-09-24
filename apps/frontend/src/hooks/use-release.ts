import { getAdminReleases, getReleases } from '@/data/api/release-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { AdminRelease, Release } from 'shared-types'
import useSWR, { mutate } from 'swr'

export const RELEASES_KEY = 'releases'
const ADMIN_RELEASES_KEY = 'admin-releases'
const EMPTY_RELEASES: Release[] = []
const EMPTY_ADMIN_RELEASES: AdminRelease[] = []

// Fetched once per page load: the dialog derives its open state from this, and a mid-session
// revalidation would pop it open over whatever the user is doing.
export function useReleases(): Release[] {
  return useSWR(RELEASES_KEY, getReleases, CATALOG_DATA_OPTIONS).data ?? EMPTY_RELEASES
}

export function useAdminReleases(): AdminRelease[] {
  return (
    useSWR(ADMIN_RELEASES_KEY, getAdminReleases, CATALOG_DATA_OPTIONS).data ?? EMPTY_ADMIN_RELEASES
  )
}

export function invalidateReleases() {
  return Promise.all([mutate(RELEASES_KEY), mutate(ADMIN_RELEASES_KEY)])
}
