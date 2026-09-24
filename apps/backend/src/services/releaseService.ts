import type { AdminRelease, Permission, Release, ReleaseNote, SaveRelease } from 'shared-types'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const NOTE_SELECT = {
  id: true,
  section: true,
  heading: true,
  link_area: true,
  permission_key: true,
  bullets: true,
  sort_order: true,
} as const

const NOTE_ORDER = { sort_order: 'asc' } as const

type ReleaseNoteRow = {
  id: number
  section: string
  heading: string | null
  link_area: string | null
  permission_key: string | null
  bullets: string[]
  sort_order: number
}

// The columns are plain strings in Postgres; the schemas that parse this payload on the
// way out are what pin them to the section and area vocabularies.
function toNotes(rows: readonly ReleaseNoteRow[]): ReleaseNote[] {
  return rows as ReleaseNote[]
}

function visibleNotes(
  rows: readonly ReleaseNoteRow[],
  permissions: ReadonlySet<Permission>,
): ReleaseNote[] {
  return toNotes(rows).filter(
    (note) => note.permission_key === null || permissions.has(note.permission_key),
  )
}

export async function listReleasesForUser(
  userId: number,
  permissions: ReadonlySet<Permission>,
): Promise<Release[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { last_seen_release: { select: { published_at: true } } },
  })
  const lastSeenAt = user?.last_seen_release?.published_at ?? null

  const releases = await prisma.release.findMany({
    where: { published_at: { not: null } },
    orderBy: { published_at: 'desc' },
    select: {
      id: true,
      published_at: true,
      notes: { select: NOTE_SELECT, orderBy: NOTE_ORDER },
    },
  })

  return releases.flatMap((release) => {
    if (release.published_at === null) return []
    const notes = visibleNotes(release.notes, permissions)
    const unread = notes.length > 0 && (lastSeenAt === null || release.published_at > lastSeenAt)
    return [{ id: release.id, published_at: release.published_at, unread, notes }]
  })
}

export async function listReleasesForAdmin(): Promise<AdminRelease[]> {
  const releases = await prisma.release.findMany({
    orderBy: [{ published_at: { sort: 'desc', nulls: 'first' } }, { created_at: 'desc' }],
    select: {
      id: true,
      version: true,
      published_at: true,
      created_at: true,
      created_by: { select: { name: true } },
      notes: { select: NOTE_SELECT, orderBy: NOTE_ORDER },
    },
  })

  return releases.map((release) => ({
    id: release.id,
    version: release.version,
    published_at: release.published_at,
    created_at: release.created_at,
    created_by_name: release.created_by.name,
    notes: toNotes(release.notes),
  }))
}

export async function createRelease(userId: number): Promise<{ id: number }> {
  const release = await prisma.release.create({
    data: { created_by_id: userId },
    select: { id: true },
  })
  return { id: release.id }
}

export async function saveRelease(id: number, body: SaveRelease): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.release.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Release ${id} not found`)

    if (body.published_at !== null && body.notes.length === 0) {
      throw new ValidationError('A published release needs at least one note')
    }

    await tx.release.update({
      where: { id },
      data: {
        version: body.version,
        published_at: body.published_at === null ? null : new Date(body.published_at),
      },
    })
    await tx.releaseNote.deleteMany({ where: { release_id: id } })
    await tx.releaseNote.createMany({
      data: body.notes.map((note, index) => ({
        release_id: id,
        section: note.section,
        heading: note.heading,
        link_area: note.link_area,
        permission_key: note.permission_key,
        bullets: note.bullets,
        sort_order: index,
      })),
    })
  })
}

export async function deleteRelease(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.release.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Release ${id} not found`)

    await tx.release.delete({ where: { id } })
  })
}

export async function setLastSeenRelease(userId: number, releaseId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const release = await tx.release.findFirst({
      where: { id: releaseId, published_at: { not: null } },
      select: { id: true },
    })
    if (!release) throw new NotFoundError(`Release ${releaseId} not found`)

    await tx.user.update({ where: { id: userId }, data: { last_seen_release_id: releaseId } })
  })
}
