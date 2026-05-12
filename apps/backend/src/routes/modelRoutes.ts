import express from 'express'
import { createModel, getModels } from '../controllers/modelController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getModels)
router.post('/', requirePermission('manage_settings'), createModel)

export default router