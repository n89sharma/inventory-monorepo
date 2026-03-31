import express from 'express'
import { getHoldDetail, getHolds, HoldQuerySchema } from '../controllers/holdController.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(HoldQuerySchema), getHolds)
router.get('/:holdNumber', getHoldDetail)

export default router
