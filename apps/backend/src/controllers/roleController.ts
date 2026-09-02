import {
  CreateRoleSchema,
  SetRolePermissionsSchema,
  successResponse,
  UpdateRoleSchema,
  type MyPermissions,
} from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  createRole as createRoleSer,
  deleteRole as deleteRoleSer,
  listRoles as listRolesSer,
  renameRole as renameRoleSer,
  setRolePermissions as setRolePermissionsSer,
} from '../services/roleService.js'

export const getRoles = asyncHandler(async (_req, res) => {
  const roles = await listRolesSer()
  res.json(successResponse(roles))
})

export const getMyPermissions = asyncHandler(async (_req, res) => {
  const data: MyPermissions = [...res.locals.permissions]
  res.json(successResponse(data))
})

export const createRole = asyncHandler(async (req, res) => {
  const role = await createRoleSer(CreateRoleSchema.parse(req.body))
  res.status(201).json(successResponse(role))
})

export const renameRole = asyncHandler(async (req, res) => {
  const { name } = UpdateRoleSchema.parse(req.body)
  await renameRoleSer(req.params.code, name)
  res.status(204).send()
})

export const setRolePermissions = asyncHandler(async (req, res) => {
  const { permissions } = SetRolePermissionsSchema.parse(req.body)
  await setRolePermissionsSer(req.params.code, permissions)
  res.status(204).send()
})

export const deleteRole = asyncHandler(async (req, res) => {
  await deleteRoleSer(req.params.code)
  res.status(204).send()
})
