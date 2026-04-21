import express from 'express'
import { createModel, getModels } from '../controllers/modelController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getModels)
router.post('/', createModel)

export default router