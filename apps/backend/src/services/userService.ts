import { prisma } from '../prisma.js'

export const DEFAULT_ROLE = 'member'

interface ClerkUserCreatedInput {
  clerkId: string
  email: string | null
  name: string
  role: string
}

interface ClerkUserUpdatedInput {
  clerkId: string
  email: string | null
  name: string
}

// Link a Clerk user to a local row. `email` and `name` are both unique, so a
// pre-provisioned row (name set, email null/mismatched) must be matched by name too —
// otherwise a bare create collides on the `name` unique constraint. Email is the Clerk
// login identity, so it wins; name is the fallback. Lookup + write run in one interactive
// transaction to keep the check-and-write atomic (TOCTOU).
export async function syncClerkUserCreated({
  clerkId,
  email,
  name,
  role,
}: ClerkUserCreatedInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing =
      (email ? await tx.user.findUnique({ where: { email } }) : null) ??
      (await tx.user.findUnique({ where: { name } }))

    if (existing) {
      // A name match implies no other row holds this email (the email lookup above missed),
      // so populating email here can't violate the unique constraint. Name is left as-is —
      // overwriting it could collide with a third row and edits flow through user.updated.
      await tx.user.update({
        where: { id: existing.id },
        data: { clerk_id: clerkId, email: email ?? undefined, is_active: true, role },
      })
    } else {
      await tx.user.create({
        data: { clerk_id: clerkId, email: email ?? undefined, name, is_active: true, role },
      })
    }
  })
}

// Sync a Clerk profile edit. Only email/name are touched — role is left as-is so a manually
// assigned role survives a profile change (mirrors the controller's metadata preservation).
export async function syncClerkUserUpdated({
  clerkId,
  email,
  name,
}: ClerkUserUpdatedInput): Promise<void> {
  await prisma.user.update({
    where: { clerk_id: clerkId },
    data: { email: email ?? undefined, name },
  })
}

export async function deactivateClerkUser(clerkId: string): Promise<void> {
  await prisma.user.update({
    where: { clerk_id: clerkId },
    data: { is_active: false, clerk_id: null },
  })
}
