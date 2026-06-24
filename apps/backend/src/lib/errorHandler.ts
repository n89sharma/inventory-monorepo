import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../../generated/prisma/client.js'
import { response400, response404, response409, response500 } from 'shared-types'
import { ConflictError, NotFoundError, ValidationError } from './errors.js'
import { logger } from './logger.js'

const isDev = process.env.NODE_ENV !== 'production'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const details = isDev
      ? err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      : (() => {
          const fields = [...new Set(err.issues.map((e) => e.path.join('.')).filter(Boolean))].join(
            ', ',
          )
          return fields ? `Invalid fields: ${fields}` : 'Invalid request'
        })()
    res.status(400).json(response400('Validation failed', details))
    return
  }
  if (err instanceof ConflictError) {
    res.status(409).json(response409(err.message))
    return
  }
  if (err instanceof NotFoundError) {
    res.status(404).json(response404(err.message))
    return
  }
  if (err instanceof ValidationError) {
    res.status(400).json(response400(err.message))
    return
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(400).json(response400('A record with these details already exists'))
    return
  }
  logger.error('Unhandled error', {
    requestId: req.id ?? 'unknown',
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  res.status(500).json(response500('An unexpected error occurred'))
}
