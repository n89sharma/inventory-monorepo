import { Request, Response } from 'express'
import { UpdateLastSeenReleaseSchema } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import { setLastSeenRelease } from '../services/releaseService.js'

export const updateLastSeenRelease = asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateLastSeenReleaseSchema.parse(req.body)
  await setLastSeenRelease(res.locals.dbUserId, body.release_id)
  res.status(204).send()
})
