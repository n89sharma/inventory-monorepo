import { getAuth } from '@clerk/express'
import { NextFunction, Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req)

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true }
  })

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  res.locals.dbUserId = user.id
  next()
}
