import { Request, Response } from 'express'
import { getUsers as getUsersDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { z } from 'zod'

export const UserQuerySchema = z.object({
  filterActive: z.string().optional().transform(v => v === 'true'),
})

export async function getUsers(req: Request, res: Response) {
  try {
    const { filterActive } = res.locals.query as z.infer<typeof UserQuerySchema>
    const users = await prisma.$queryRawTyped(getUsersDb(filterActive))
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}
