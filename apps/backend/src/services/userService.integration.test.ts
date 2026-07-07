import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '../prisma.js'
import { DEFAULT_ROLE, deactivateClerkUser, syncClerkUserCreated } from './userService.js'

// Distinct prefix so cleanup can target only rows this suite creates — users are not
// touched by cleanupTransactionalData, and `name` is unique so leftovers would break reruns.
const NAME_PREFIX = 'clerk-test:'

async function cleanupUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

describe('userService', () => {
  afterEach(cleanupUsers)

  it('creates a new user when nothing matches', async () => {
    const name = `${NAME_PREFIX}new`
    await syncClerkUserCreated({
      clerkId: 'clerk_new',
      email: 'new@example.com',
      name,
      role: DEFAULT_ROLE,
    })

    const users = await prisma.user.findMany({ where: { name } })
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      clerk_id: 'clerk_new',
      email: 'new@example.com',
      is_active: true,
      role: DEFAULT_ROLE,
    })
  })

  it('matches by email and updates the existing row without duplicating', async () => {
    const name = `${NAME_PREFIX}by-email`
    const seeded = await prisma.user.create({
      data: { name, email: 'match@example.com', is_active: false, role: 'admin' },
    })

    await syncClerkUserCreated({
      clerkId: 'clerk_email',
      email: 'match@example.com',
      name: `${NAME_PREFIX}different-name`,
      role: DEFAULT_ROLE,
    })

    const linked = await prisma.user.findUniqueOrThrow({ where: { id: seeded.id } })
    expect(linked.clerk_id).toBe('clerk_email')
    expect(linked.is_active).toBe(true)
    // Name is not overwritten on an existing-row match.
    expect(linked.name).toBe(name)
    const total = await prisma.user.count({ where: { name: { startsWith: NAME_PREFIX } } })
    expect(total).toBe(1)
  })

  it('matches a pre-provisioned name-only row and populates clerk_id + email (the bug)', async () => {
    const name = `${NAME_PREFIX}pre-provisioned`
    const seeded = await prisma.user.create({
      data: { name, email: null, is_active: false, role: null },
    })

    await syncClerkUserCreated({
      clerkId: 'clerk_name',
      email: 'newlySignedUp@example.com',
      name,
      role: DEFAULT_ROLE,
    })

    const linked = await prisma.user.findUniqueOrThrow({ where: { id: seeded.id } })
    expect(linked).toMatchObject({
      clerk_id: 'clerk_name',
      email: 'newlySignedUp@example.com',
      is_active: true,
      role: DEFAULT_ROLE,
    })
    const total = await prisma.user.count({ where: { name: { startsWith: NAME_PREFIX } } })
    expect(total).toBe(1)
  })

  it('deactivates a user and clears its clerk_id', async () => {
    const name = `${NAME_PREFIX}deactivate`
    await prisma.user.create({
      data: { name, clerk_id: 'clerk_del', email: 'del@example.com', is_active: true },
    })

    await deactivateClerkUser('clerk_del')

    const row = await prisma.user.findUniqueOrThrow({ where: { name } })
    expect(row.is_active).toBe(false)
    expect(row.clerk_id).toBeNull()
  })
})
