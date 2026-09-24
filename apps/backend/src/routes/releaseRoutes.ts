import express from 'express'
import {
  createRelease,
  deleteRelease,
  getAdminReleases,
  getReleases,
  saveRelease,
} from '../controllers/releaseController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', getReleases)
router.get('/admin', requirePermission('update_settings'), getAdminReleases)
router.post('/', requirePermission('update_settings'), createRelease)
router.put('/:releaseId', requirePermission('update_settings'), saveRelease)
router.delete('/:releaseId', requirePermission('update_settings'), deleteRelease)

export default router
