import express from 'express'
import { createDeparture, getDepartureDetail, getDepartureForUpdate, getDepartures, updateDeparture } from '../controllers/departureController.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(DateRangeWithWarehouseSchema), getDepartures)
router.post('/', createDeparture)
router.get('/:departureNumber/edit', getDepartureForUpdate)
router.get('/:departureNumber', getDepartureDetail)
router.put('/:departureNumber', updateDeparture)

export default router
