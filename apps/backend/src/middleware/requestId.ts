import { NextFunction, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requestContext } from '../lib/context.js'

declare global {
  namespace Express {
    interface Request {
      id: string
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.id = uuidv4()
  res.setHeader('X-Request-Id', req.id)
  requestContext.run({ requestId: req.id }, next)
}
