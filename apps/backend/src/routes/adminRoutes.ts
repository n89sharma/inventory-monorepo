import express from 'express'
import { setUserRole, toggleUserActive } from '../controllers/userController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = express.Router()

router.use(requireAuth)
router.use(requireRole('admin'))

router.put('/users/:userId/role', setUserRole)
router.patch('/users/:userId', toggleUserActive)

export default router
