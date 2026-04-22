import { verifyWebhook } from '@clerk/express/webhooks'
import { Request, Response } from 'express'
import { prisma } from '../prisma.js'

const DEFAULT_ROLE_ID = 2 // MEMBER (read-only)

export async function handleClerkWebhook(req: Request, res: Response) {
  try {
    const evt = await verifyWebhook(req)

    if (evt.type === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data

      const email = email_addresses?.[0]?.email_address ?? null
      const name = [first_name, last_name].filter(Boolean).join(' ') || (email?.split('@')[0] ?? id)

      const existingUser = email
        ? await prisma.user.findUnique({ where: { email } })
        : null

      if (existingUser) {
        await prisma.user.update({
          where: { email },
          data: { clerk_id: id, is_active: true }
        })
      } else {
        await prisma.user.create({
          data: {
            clerk_id: id,
            email,
            name,
            role_id: DEFAULT_ROLE_ID,
            is_active: true
          }
        })
      }
    }

    res.status(200).send('Webhook received')
  } catch (err) {
    console.error('Error verifying webhook:', err)
    res.status(400).send('Error verifying webhook')
  }
}
