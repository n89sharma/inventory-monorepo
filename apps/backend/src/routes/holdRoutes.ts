import express from 'express'
import { createHold, getHoldDetail, getHoldForUpdate, getHolds, HoldQuerySchema, updateHold } from '../controllers/holdController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', validateQuery(HoldQuerySchema), getHolds)
router.post('/', createHold)
router.get('/:holdNumber/edit', getHoldForUpdate)
router.get('/:holdNumber', getHoldDetail)
router.put('/:holdNumber', updateHold)

export default router
