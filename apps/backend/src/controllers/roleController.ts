import { successResponse, type MyPermissions } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import { listRoles as listRolesSer } from '../services/roleService.js'

export const getRoles = asyncHandler(async (_req, res) => {
  const roles = await listRolesSer()
  res.json(successResponse(roles))
})

export const getMyPermissions = asyncHandler(async (_req, res) => {
  const data: MyPermissions = [...res.locals.permissions]
  res.json(successResponse(data))
})
