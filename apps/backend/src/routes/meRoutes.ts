import express from 'express'
import { getMyPermissions } from '../controllers/roleController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/permissions', getMyPermissions)

export default router
