import express from 'express'
import {
  createOrganization,
  getOrganizations,
  updateOrganization,
} from '../controllers/organizationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getOrganizations)
router.post('/', requirePermission('update_settings'), createOrganization)
router.patch('/:orgId', requirePermission('update_settings'), updateOrganization)

export default router
