import express from 'express'
import { createModel, getModels, updateModel } from '../controllers/modelController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getModels)
router.post('/', requirePermission('update_settings'), createModel)
router.patch('/:modelId', requirePermission('update_settings'), updateModel)

export default router
