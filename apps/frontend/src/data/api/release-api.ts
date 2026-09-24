import { api } from '@/data/api/axios-client'
import type { AdminRelease, Release, SaveRelease, UpdateLastSeenRelease } from 'shared-types'
import {
  AdminReleaseSchema,
  ReleaseSchema,
  SaveReleaseSchema,
  UpdateLastSeenReleaseSchema,
} from 'shared-types'
import { z } from 'zod'

const CreatedReleaseSchema = z.object({ id: z.int() })

export async function getReleases(): Promise<Release[]> {
  const { data } = await api.get<Release[]>('/releases')
  return z.array(ReleaseSchema).parse(data)
}

export async function getAdminReleases(): Promise<AdminRelease[]> {
  const { data } = await api.get<AdminRelease[]>('/releases/admin')
  return z.array(AdminReleaseSchema).parse(data)
}

export async function createRelease(): Promise<number> {
  const { data } = await api.post<{ id: number }>('/releases')
  return CreatedReleaseSchema.parse(data).id
}

export async function saveRelease(id: number, release: SaveRelease): Promise<void> {
  const saveReleaseBody = SaveReleaseSchema.parse(release satisfies SaveRelease)
  await api.put(`/releases/${id}`, saveReleaseBody)
}

export async function deleteRelease(id: number): Promise<void> {
  await api.delete(`/releases/${id}`)
}

export async function updateLastSeenRelease(releaseId: number): Promise<void> {
  const updateLastSeenReleaseBody = UpdateLastSeenReleaseSchema.parse({
    release_id: releaseId,
  } satisfies UpdateLastSeenRelease)
  await api.patch('/me/last-seen-release', updateLastSeenReleaseBody)
}
