import { clerkClient } from '@clerk/express'
import { verifyWebhook } from '@clerk/express/webhooks'
import { Request, Response } from 'express'
import { userIdCache } from '../middleware/requireAuth.js'
import { prisma } from '../prisma.js'
import { logger } from '../lib/logger.js'

const CLERK_USER_CREATED  = 'user.created'
const CLERK_USER_UPDATED  = 'user.updated'
const CLERK_USER_DELETED  = 'user.deleted'
const DEFAULT_ROLE        = 'member'

function getPrimaryEmail(
  emailAddresses: { id: string; email_address: string }[],
  primaryEmailAddressId: string | null | undefined,
): string | null {
  if (primaryEmailAddressId) {
    const primary = emailAddresses.find(e => e.id === primaryEmailAddressId)
    if (primary) return primary.email_address
  }
  return emailAddresses[0]?.email_address ?? null
}

function buildName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string,
): string {
  return [firstName, lastName].filter(Boolean).join(' ') || fallback
}

export async function handleClerkWebhook(req: Request, res: Response) {
  try {
    const evt = await verifyWebhook(req)

    if (evt.type === CLERK_USER_CREATED) {
      const { id, email_addresses, first_name, last_name, primary_email_address_id } = evt.data

      const email = getPrimaryEmail(email_addresses, primary_email_address_id)
      const name = buildName(first_name, last_name, email?.split('@')[0] ?? id)

      const existingUser = email
        ? await prisma.user.findUnique({ where: { email } })
        : null

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { clerk_id: id, is_active: true, role: DEFAULT_ROLE },
        })
      } else {
        await prisma.user.create({
          data: {
            clerk_id: id,
            email: email ?? undefined,
            name,
            is_active: true,
            role: DEFAULT_ROLE,
          },
        })
      }

      // Only set Clerk metadata if no role exists yet (preserves manually assigned roles)
      const existingRole = evt.data.public_metadata?.role
      if (!existingRole) {
        await clerkClient.users.updateUserMetadata(id, { publicMetadata: { role: DEFAULT_ROLE } })
      }
    }

    if (evt.type === CLERK_USER_UPDATED) {
      const { id, email_addresses, first_name, last_name, primary_email_address_id } = evt.data

      const email = getPrimaryEmail(email_addresses, primary_email_address_id)
      const name = buildName(first_name, last_name, email?.split('@')[0] ?? id)

      await prisma.user.update({
        where: { clerk_id: id },
        data: { email: email ?? undefined, name },
      })
    }

    if (evt.type === CLERK_USER_DELETED) {
      const { id } = evt.data

      if (id) {
        userIdCache.delete(id)
        await prisma.user.update({
          where: { clerk_id: id },
          data: { is_active: false, clerk_id: null },
        })
      }
    }

    res.status(200).send('Webhook received')
  } catch (err) {
    logger.error('Error verifying webhook', { error: err })
    res.status(400).send('Error verifying webhook')
  }
}
