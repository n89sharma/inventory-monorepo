import express from 'express'
import { createArrival, getArrivals, getArrival, getArrivalForEdit, updateArrival } from '../controllers/arrivalController.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(DateRangeWithWarehouseSchema), getArrivals)
router.post('/', createArrival)
router.get('/:arrivalNumber/edit', getArrivalForEdit)
router.get('/:arrivalNumber', getArrival)
router.put('/:arrivalNumber', updateArrival)

export default router