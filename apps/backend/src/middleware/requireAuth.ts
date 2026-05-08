import { getAuth } from '@clerk/express'
import { NextFunction, Request, Response } from 'express'
import { LRUCache } from 'lru-cache'
import { response400 } from 'shared-types'
import { prisma } from '../prisma.js'

// clerk_id → internal DB user id; TTL 1 hour, max 500 entries
export const userIdCache = new LRUCache<string, number>({ max: 500, ttl: 1000 * 60 * 60 })

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req)

  if (!userId) {
    return res.status(401).json(response400('Unauthorized'))
  }

  const cached = userIdCache.get(userId)
  if (cached !== undefined) {
    res.locals.dbUserId = cached
    return next()
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true }
  })

  if (!user) {
    return res.status(401).json(response400('User not found'))
  }

  userIdCache.set(userId, user.id)
  res.locals.dbUserId = user.id
  next()
}
