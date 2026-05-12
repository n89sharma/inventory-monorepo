import { NextFunction, Request, Response } from 'express'
import { ROLE_PERMISSIONS, type AppRole, type Permission } from 'shared-types'
import { response400 } from 'shared-types'

export function requirePermission(permission: Permission) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const role: AppRole | null = res.locals.dbUserRole
    if (!role || !ROLE_PERMISSIONS[role].includes(permission)) {
      return res.status(403).json(response400('Forbidden: insufficient permissions'))
    }
    next()
  }
}
