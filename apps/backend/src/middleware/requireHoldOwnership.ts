import { NextFunction, Request, Response } from 'express'
import { ROLE_PERMISSIONS, response403, response404, type AppRole } from 'shared-types'
import { prisma } from '../prisma.js'

// Resolves whether the current user may edit the given hold (owner or edit_any_hold),
// writing the 404/403 response and returning false when they may not. Shared by the
// destination guard (route param) and the source guard (request body).
async function assertHoldEditable(res: Response, holdNumber: string | undefined): Promise<boolean> {
  const role: AppRole | null = res.locals.dbUserRole
  if (role && ROLE_PERMISSIONS[role].includes('edit_any_hold')) return true

  if (holdNumber === undefined) {
    res.status(404).json(response404('Hold not found'))
    return false
  }
  const hold = await prisma.hold.findUnique({
    where: { hold_number: holdNumber },
    select: { created_by_id: true },
  })
  if (!hold) {
    res.status(404).json(response404(`Hold ${holdNumber} not found`))
    return false
  }
  if (hold.created_by_id !== res.locals.dbUserId) {
    res.status(403).json(response403('Forbidden: you do not own this hold'))
    return false
  }
  return true
}

export async function requireHoldOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (await assertHoldEditable(res, req.params.holdNumber)) next()
}

// Guards the source hold of a move, whose number travels in the request body.
export async function requireSourceHoldOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sourceHoldNumber = (req.body as { sourceHoldNumber?: string } | undefined)?.sourceHoldNumber
  if (await assertHoldEditable(res, sourceHoldNumber)) next()
}
