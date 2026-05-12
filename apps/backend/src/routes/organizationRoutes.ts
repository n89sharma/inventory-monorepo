import express from 'express'
import { createOrganization, getOrganizations } from '../controllers/organizationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getOrganizations)
router.post('/', requirePermission('manage_settings'), createOrganization)

export default router