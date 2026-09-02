import { NextFunction, Request, Response } from 'express'
import { response403, type Permission } from 'shared-types'

export function requirePermission(permission: Permission) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.permissions.has(permission)) {
      return res.status(403).json(response403('Forbidden: insufficient permissions'))
    }
    next()
  }
}
