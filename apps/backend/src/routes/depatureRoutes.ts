import express from 'express'
import { createDeparture, getDepartureDetail, getDepartureHistory, getDepartures, patchDepartureAssets, patchDepartureMetadata } from '../controllers/departureController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { DateRangeWithWarehouseSchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/',                         requirePermission('view_collections'),          validateQuery(DateRangeWithWarehouseSchema), getDepartures)
router.post('/',                        requirePermission('create_update_departure'),   createDeparture)
router.get('/:departureNumber/history', requirePermission('view_collections'),          getDepartureHistory)
router.get('/:departureNumber',         requirePermission('view_collections'),          getDepartureDetail)
router.patch('/:departureNumber/assets',requirePermission('create_update_departure'),   patchDepartureAssets)
router.patch('/:departureNumber/metadata',requirePermission('create_update_departure'), patchDepartureMetadata)

export default router
