import {
  createRelease as createReleaseApi,
  deleteRelease as deleteReleaseApi,
  saveRelease as saveReleaseApi,
  updateLastSeenRelease,
} from '@/data/api/release-api'
import { RELEASES_KEY, invalidateReleases } from '@/hooks/use-release'
import type { Release, SaveRelease } from 'shared-types'
import { mutate } from 'swr'

function asRead(releases: Release[] | undefined): Release[] {
  return (releases ?? []).map((release) => ({ ...release, unread: false }))
}

// The sidebar dot reads the same cache, so both clear in one render while the write is in flight.
async function markReleasesRead(releaseId: number): Promise<void> {
  mutate<Release[]>(RELEASES_KEY, asRead, { revalidate: false })
  try {
    await updateLastSeenRelease(releaseId)
  } finally {
    await mutate(RELEASES_KEY)
  }
}

async function createRelease(): Promise<number> {
  const id = await createReleaseApi()
  await invalidateReleases()
  return id
}

async function saveRelease(id: number, release: SaveRelease): Promise<void> {
  await saveReleaseApi(id, release)
  await invalidateReleases()
}

async function deleteRelease(id: number): Promise<void> {
  await deleteReleaseApi(id)
  await invalidateReleases()
}

const mutations = {
  markReleasesRead,
  createRelease,
  saveRelease,
  deleteRelease,
} as const

export function useReleaseMutations() {
  return mutations
}
