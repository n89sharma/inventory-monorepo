import { Request, Response } from 'express'
import { ApiResponse, User, response500, successResponse } from 'shared-types'
import { getUsers as getUsersDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { z } from 'zod'

export const UserQuerySchema = z.object({
  filterActive: z.string().optional().transform(v => v === 'true'),
})

export async function getUsers(req: Request, res: Response<ApiResponse<User[]>>) {
  try {
    const { filterActive } = res.locals.query as z.infer<typeof UserQuerySchema>
    const users = await prisma.$queryRawTyped(getUsersDb(filterActive))
    res.json(successResponse(users))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch users'))
  }
}
