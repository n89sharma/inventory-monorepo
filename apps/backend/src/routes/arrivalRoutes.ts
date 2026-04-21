import express from 'express'
import { createArrival, getArrival, getArrivalForUpdate, getArrivals, updateArrival } from '../controllers/arrivalController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', validateQuery(DateRangeWithWarehouseSchema), getArrivals)
router.post('/', createArrival)
router.get('/:arrivalNumber/edit', getArrivalForUpdate)
router.get('/:arrivalNumber', getArrival)
router.put('/:arrivalNumber', updateArrival)

export default router