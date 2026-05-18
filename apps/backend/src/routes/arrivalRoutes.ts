import express from 'express'
import { createArrival, createSingleArrivalAsset, getArrival, getArrivalAssetForUpdate, getArrivalForUpdate, getArrivalHistory, getArrivals, patchArrivalAssets, updateArrival, updateArrivalAsset } from '../controllers/arrivalController.js'
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
router.patch('/:arrivalNumber/assets',requirePermission('create_update_arrival'),   patchArrivalAssets)
router.post('/:arrivalNumber/assets', requirePermission('create_update_arrival'),   createSingleArrivalAsset)
router.get('/:arrivalNumber/assets/:assetId/edit',  requirePermission('create_update_arrival'), getArrivalAssetForUpdate)
router.patch('/:arrivalNumber/assets/:assetId',     requirePermission('create_update_arrival'), updateArrivalAsset)

export default router