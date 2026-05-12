import express from 'express'
import { createArrival, getArrival, getArrivalForUpdate, getArrivalHistory, getArrivals, updateArrival } from '../controllers/arrivalController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/',                       requirePermission('view_collections'),        validateQuery(DateRangeWithWarehouseSchema), getArrivals)
router.post('/',                      requirePermission('create_update_arrival'),   createArrival)
router.get('/:arrivalNumber/history', requirePermission('view_collections'),        getArrivalHistory)
router.get('/:arrivalNumber/edit',    requirePermission('create_update_arrival'),   getArrivalForUpdate)
router.get('/:arrivalNumber',         requirePermission('view_collections'),        getArrival)
router.put('/:arrivalNumber',         requirePermission('create_update_arrival'),   updateArrival)

export default router