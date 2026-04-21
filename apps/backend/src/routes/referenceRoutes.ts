import express from 'express'
import { getReferenceData } from '../controllers/referenceController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getReferenceData)

export default router
