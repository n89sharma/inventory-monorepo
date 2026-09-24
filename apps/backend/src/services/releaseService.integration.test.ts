import type { Permission, SaveRelease, SaveReleaseNote } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ValidationError } from '../lib/errors.js'
import {
  createRelease,
  listReleasesForUser,
  saveRelease,
  setLastSeenRelease,
} from './releaseService.js'

const NO_PERMISSIONS: ReadonlySet<Permission> = new Set()
const SETTINGS_ONLY: ReadonlySet<Permission> = new Set<Permission>(['update_settings'])
const EARLIER_PUBLISHED_AT = '2026-09-10T00:00:00.000Z'
const LATER_PUBLISHED_AT = '2026-09-17T00:00:00.000Z'

const openNote = {
  section: 'new',
  heading: 'Filter invoices by arrival date',
  link_area: 'invoices',
  permission_key: null,
  bullets: ['Reconcile a month by when machines arrived'],
} satisfies SaveReleaseNote

const gatedNote = {
  section: 'improved',
  heading: 'Merge duplicate organizations',
  link_area: null,
  permission_key: 'update_settings',
  bullets: ['Pick rows with a checkbox and merge them'],
} satisfies SaveReleaseNote

async function seedPublishedRelease(
  userId: number,
  publishedAt: string,
  notes: SaveRelease['notes'],
): Promise<number> {
  const { id } = await createRelease(userId)
  await saveRelease(id, { version: null, published_at: publishedAt, notes })
  return id
}

describe('releaseService', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('lists published releases newest first and leaves drafts out', async () => {
    await seedPublishedRelease(refs.userId, EARLIER_PUBLISHED_AT, [openNote])
    await seedPublishedRelease(refs.userId, LATER_PUBLISHED_AT, [openNote])
    const draft = await createRelease(refs.userId)
    await saveRelease(draft.id, { version: null, published_at: null, notes: [openNote] })

    const releases = await listReleasesForUser(refs.userId, NO_PERMISSIONS)

    expect(releases).toHaveLength(2)
    expect(releases[0].published_at.toISOString()).toBe(LATER_PUBLISHED_AT)
    expect(releases[1].published_at.toISOString()).toBe(EARLIER_PUBLISHED_AT)
  })

  it('omits notes the caller has no permission for', async () => {
    await seedPublishedRelease(refs.userId, LATER_PUBLISHED_AT, [openNote, gatedNote])

    const withoutPermission = await listReleasesForUser(refs.userId, NO_PERMISSIONS)
    expect(withoutPermission[0].notes).toHaveLength(1)
    expect(withoutPermission[0].notes[0].heading).toBe(openNote.heading)

    const withPermission = await listReleasesForUser(refs.userId, SETTINGS_ONLY)
    expect(withPermission[0].notes).toHaveLength(2)
  })

  it('treats a release with no visible note as read', async () => {
    await seedPublishedRelease(refs.userId, LATER_PUBLISHED_AT, [gatedNote])

    const [release] = await listReleasesForUser(refs.userId, NO_PERMISSIONS)

    expect(release.notes).toHaveLength(0)
    expect(release.unread).toBe(false)
  })

  it('marks releases read up to the one the user last saw', async () => {
    const earlier = await seedPublishedRelease(refs.userId, EARLIER_PUBLISHED_AT, [openNote])
    await seedPublishedRelease(refs.userId, LATER_PUBLISHED_AT, [openNote])

    const beforeSeen = await listReleasesForUser(refs.userId, NO_PERMISSIONS)
    expect(beforeSeen.map((release) => release.unread)).toEqual([true, true])

    await setLastSeenRelease(refs.userId, earlier)
    const afterEarlier = await listReleasesForUser(refs.userId, NO_PERMISSIONS)
    expect(afterEarlier.map((release) => release.unread)).toEqual([true, false])

    await setLastSeenRelease(refs.userId, afterEarlier[0].id)
    const afterLatest = await listReleasesForUser(refs.userId, NO_PERMISSIONS)
    expect(afterLatest.map((release) => release.unread)).toEqual([false, false])
  })

  it('replaces the notes of a release and keeps their order', async () => {
    const id = await seedPublishedRelease(refs.userId, LATER_PUBLISHED_AT, [openNote, gatedNote])

    await saveRelease(id, {
      version: 'v1.29.0',
      published_at: LATER_PUBLISHED_AT,
      notes: [gatedNote, openNote],
    })

    const [release] = await listReleasesForUser(refs.userId, SETTINGS_ONLY)
    expect(release.notes.map((note) => note.heading)).toEqual([gatedNote.heading, openNote.heading])
    expect(release.notes.map((note) => note.sort_order)).toEqual([0, 1])
  })

  it('refuses to publish a release with no notes', async () => {
    const { id } = await createRelease(refs.userId)

    await expect(
      saveRelease(id, { version: null, published_at: LATER_PUBLISHED_AT, notes: [] }),
    ).rejects.toThrow(ValidationError)
  })

  it('hides a release again once it is unpublished', async () => {
    const id = await seedPublishedRelease(refs.userId, LATER_PUBLISHED_AT, [openNote])

    await saveRelease(id, { version: null, published_at: null, notes: [openNote] })

    expect(await listReleasesForUser(refs.userId, NO_PERMISSIONS)).toHaveLength(0)
  })
})
