import { getAuth } from '@clerk/express'
import { NextFunction, Request, Response } from 'express'
import { LRUCache } from 'lru-cache'
import { response401 } from 'shared-types'
import { prisma } from '../prisma.js'

// clerk_id → internal DB user id; TTL 1 hour, max 500 entries
export const userIdCache = new LRUCache<string, number>({ max: 500, ttl: 1000 * 60 * 60 })

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId, sessionClaims } = getAuth(req)

  if (!userId) {
    return res.status(401).json(response401('Unauthorized'))
  }

  res.locals.dbUserRole = sessionClaims?.metadata?.role ?? null

  const cached = userIdCache.get(userId)
  if (cached !== undefined) {
    res.locals.dbUserId = cached
    return next()
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId, is_active: true },
    select: { id: true },
  })

  if (!user) {
    return res.status(401).json(response401('User not found or account is deactivated'))
  }

  userIdCache.set(userId, user.id)
  res.locals.dbUserId = user.id
  next()
}
