import express from 'express'
import {
  createOrganization,
  getOrganizations,
  mergeOrganizations,
  previewOrganizationMerge,
  updateOrganization,
} from '../controllers/organizationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getOrganizations)
router.post('/', requirePermission('update_settings'), createOrganization)
router.post('/merge/preview', requirePermission('update_settings'), previewOrganizationMerge)
router.post('/merge', requirePermission('update_settings'), mergeOrganizations)
router.patch('/:orgId', requirePermission('update_settings'), updateOrganization)

export default router
