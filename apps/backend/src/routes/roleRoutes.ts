import express from 'express'
import { getRoles } from '../controllers/roleController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getRoles)

export default router
