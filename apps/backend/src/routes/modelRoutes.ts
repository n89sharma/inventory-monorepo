import express from 'express'
import {
  createModel,
  getModels,
  mergeModels,
  previewModelMerge,
  updateModel,
} from '../controllers/modelController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getModels)
router.post('/', requirePermission('update_settings'), createModel)
router.post('/merge/preview', requirePermission('update_settings'), previewModelMerge)
router.post('/merge', requirePermission('update_settings'), mergeModels)
router.patch('/:modelId', requirePermission('update_settings'), updateModel)

export default router
