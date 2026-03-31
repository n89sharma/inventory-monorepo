import express from 'express'
import { getDepartureDetail, getDepartures } from '../controllers/departureController.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(DateRangeWithWarehouseSchema), getDepartures)
router.get('/:departureNumber', getDepartureDetail)

export default router