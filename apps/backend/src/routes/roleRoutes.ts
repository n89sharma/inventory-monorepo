import express from 'express'
import {
  createRole,
  deleteRole,
  getRoles,
  renameRole,
  setRolePermissions,
} from '../controllers/roleController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getRoles)
router.post('/', requirePermission('update_user_roles'), createRole)
router.patch('/:code', requirePermission('update_user_roles'), renameRole)
router.put('/:code/permissions', requirePermission('update_user_roles'), setRolePermissions)
router.delete('/:code', requirePermission('update_user_roles'), deleteRole)

export default router
