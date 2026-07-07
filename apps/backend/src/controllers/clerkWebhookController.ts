import { clerkClient } from '@clerk/express'
import { verifyWebhook } from '@clerk/express/webhooks'
import { Request, Response } from 'express'
import { userIdCache } from '../middleware/requireAuth.js'
import { logger } from '../lib/logger.js'
import {
  DEFAULT_ROLE,
  deactivateClerkUser,
  syncClerkUserCreated,
  syncClerkUserUpdated,
} from '../services/userService.js'

const CLERK_USER_CREATED = 'user.created'
const CLERK_USER_UPDATED = 'user.updated'
const CLERK_USER_DELETED = 'user.deleted'

function getPrimaryEmail(
  emailAddresses: { id: string; email_address: string }[],
  primaryEmailAddressId: string | null | undefined,
): string | null {
  if (primaryEmailAddressId) {
    const primary = emailAddresses.find((e) => e.id === primaryEmailAddressId)
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

      await syncClerkUserCreated({ clerkId: id, email, name, role: DEFAULT_ROLE })

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

      await syncClerkUserUpdated({ clerkId: id, email, name })
    }

    if (evt.type === CLERK_USER_DELETED) {
      const { id } = evt.data

      if (id) {
        userIdCache.delete(id)
        await deactivateClerkUser(id)
      }
    }

    res.status(200).send('Webhook received')
  } catch (err) {
    logger.error('Error verifying webhook', { error: err })
    res.status(400).send('Error verifying webhook')
  }
}
