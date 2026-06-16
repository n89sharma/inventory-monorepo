import { NextFunction, Request, Response } from 'express'
import { ROLE_PERMISSIONS, response403, response404, type AppRole } from 'shared-types'
import { prisma } from '../prisma.js'

export async function requireHoldOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const role: AppRole | null = res.locals.dbUserRole
  if (role && ROLE_PERMISSIONS[role].includes('edit_any_hold')) {
    return next()
  }

  const holdNumber = req.params.holdNumber
  const hold = await prisma.hold.findUnique({
    where: { hold_number: holdNumber },
    select: { created_by_id: true }
  })
  if (!hold) {
    res.status(404).json(response404(`Hold ${holdNumber} not found`))
    return
  }
  if (hold.created_by_id !== res.locals.dbUserId) {
    res.status(403).json(response403('Forbidden: you do not own this hold'))
    return
  }
  next()
}
