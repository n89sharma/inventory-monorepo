import express from 'express'
import { createDepartureHandler, getDepartureDetail, getDepartureForUpdate, getDepartures, updateDepartureHandler } from '../controllers/departureController.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(DateRangeWithWarehouseSchema), getDepartures)
router.post('/', createDepartureHandler)
router.get('/:departureNumber/edit', getDepartureForUpdate)
router.get('/:departureNumber', getDepartureDetail)
router.put('/:departureNumber', updateDepartureHandler)

export default router
