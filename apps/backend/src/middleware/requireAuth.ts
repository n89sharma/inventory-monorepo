import { getAuth } from '@clerk/express'
import { NextFunction, Request, Response } from 'express'
import { response400 } from 'shared-types'
import { prisma } from '../prisma.js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req)

  if (!userId) {
    return res.status(401).json(response400('Unauthorized'))
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true }
  })

  if (!user) {
    return res.status(401).json(response400('User not found'))
  }

  res.locals.dbUserId = user.id
  next()
}
