import express from 'express'
import { getAssetsForHold, getHolds, HoldQuerySchema } from '../controllers/holdController.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(HoldQuerySchema), getHolds)
router.get('/:holdNumber', getAssetsForHold)

export default router
