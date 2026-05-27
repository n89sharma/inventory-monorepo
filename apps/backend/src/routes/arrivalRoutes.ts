import express from 'express'
import { createArrival, createSingleArrivalAsset, getArrival, getArrivalAssetForUpdate, getArrivalHistory, getArrivals, patchArrivalAssets, patchArrivalMetadata, updateArrivalAsset } from '../controllers/arrivalController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { ArrivalListQuerySchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/',                       requirePermission('view_collections'),        validateQuery(ArrivalListQuerySchema), getArrivals)
router.post('/',                      requirePermission('create_update_arrival'),   createArrival)
router.get('/:arrivalNumber/history', requirePermission('view_collections'),        getArrivalHistory)
router.get('/:arrivalNumber',         requirePermission('view_collections'),        getArrival)
router.patch('/:arrivalNumber/metadata',requirePermission('create_update_arrival'), patchArrivalMetadata)
router.patch('/:arrivalNumber/assets',requirePermission('create_update_arrival'),   patchArrivalAssets)
router.post('/:arrivalNumber/assets', requirePermission('create_update_arrival'),   createSingleArrivalAsset)
router.get('/:arrivalNumber/assets/:assetId/edit',  requirePermission('create_update_arrival'), getArrivalAssetForUpdate)
router.patch('/:arrivalNumber/assets/:assetId',     requirePermission('create_update_arrival'), updateArrivalAsset)

export default router