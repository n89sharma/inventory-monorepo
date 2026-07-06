import express from 'express'
import { setUserRole, toggleUserActive } from '../controllers/userController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.put('/users/:userId/role', requirePermission('update_user_roles'), setUserRole)
router.patch('/users/:userId', requirePermission('update_users'), toggleUserActive)

export default router
