import { successResponse } from 'shared-types'
import { z } from 'zod'
import { getUsers as getUsersDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { prisma } from '../prisma.js'

export const UserQuerySchema = z.object({
  filterActive: z.string().optional().transform(v => v === 'true'),
})

export const getUsers = asyncHandler(async (req, res) => {
  const { filterActive } = res.locals.query as z.infer<typeof UserQuerySchema>
  const users = await prisma.$queryRawTyped(getUsersDb(filterActive))
  res.json(successResponse(users))
})
