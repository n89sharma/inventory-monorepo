import { clerkClient } from '@clerk/express'
import { SetRoleSchema, successResponse, ToggleActiveSchema } from 'shared-types'
import { z } from 'zod'
import { getUsers as getUsersDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { userIdCache } from '../middleware/requireAuth.js'
import { prisma } from '../prisma.js'

const DEFAULT_ROLE = 'member'

export const UserQuerySchema = z.object({
  filterActive: z.string().optional().transform(v => v === 'true'),
})

export const getUsers = asyncHandler(async (req, res) => {
  const { filterActive } = res.locals.query as z.infer<typeof UserQuerySchema>
  const users = await prisma.$queryRawTyped(getUsersDb())
  if (filterActive) {
    res.json(successResponse(users.filter(u => u.is_active)))
  } else {
    res.json(successResponse(users))
  }
})

export const setUserRole = asyncHandler(async (req, res) => {
  const targetDbUserId = Number(req.params.userId)
  const { role } = SetRoleSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { id: targetDbUserId },
    select: { clerk_id: true },
  })
  if (!user) throw new NotFoundError('User not found')
  if (!user.clerk_id) throw new NotFoundError('User not in Clerk')

  await Promise.all([
    prisma.user.update({ where: { id: targetDbUserId }, data: { role } }),
    clerkClient.users.updateUserMetadata(user.clerk_id, { publicMetadata: { role } })
  ])

  res.json(successResponse({ userId: targetDbUserId, role }))
})

export const toggleUserActive = asyncHandler(async (req, res) => {
  const targetDbUserId = Number(req.params.userId)
  const { is_active } = ToggleActiveSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { id: targetDbUserId },
    select: { clerk_id: true },
  })
  if (!user) throw new NotFoundError('User not found')
  if (!user.clerk_id) throw new NotFoundError('User not in Clerk')

  const role = is_active ? DEFAULT_ROLE : null

  await Promise.all([
    prisma.user.update({ where: { id: targetDbUserId }, data: { is_active, role } }),
    clerkClient.users.updateUserMetadata(user.clerk_id, { publicMetadata: { role } })
  ])

  if (!is_active) userIdCache.delete(user.clerk_id)

  res.json(successResponse({ userId: targetDbUserId, is_active }))
})
