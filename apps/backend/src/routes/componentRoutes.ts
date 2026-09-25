import express from 'express'
import {
  createComponent,
  getComponents,
  mergeComponents,
  previewComponentMerge,
  updateComponent,
} from '../controllers/componentController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getComponents)
router.post('/', requirePermission('update_settings'), createComponent)
router.post('/merge/preview', requirePermission('update_settings'), previewComponentMerge)
router.post('/merge', requirePermission('update_settings'), mergeComponents)
router.patch('/:componentId', requirePermission('update_settings'), updateComponent)

export default router
