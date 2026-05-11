import { NextFunction, Request, Response } from 'express'
import type { AppRole } from 'shared-types'
import { response400 } from 'shared-types'

export function requireRole(...allowed: AppRole[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const role = res.locals.dbUserRole
    if (!role || !allowed.includes(role)) {
      return res.status(403).json(response400('Forbidden: insufficient permissions'))
    }
    next()
  }
}
