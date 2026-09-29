import express from 'express'
import {
  completeDeparture,
  createDeparture,
  finishLoadingDeparture,
  getDepartureDetail,
  getDepartureHistory,
  getDepartures,
  markDepartureAssetMissingAtLoad,
  patchDepartureAssets,
  patchDepartureDate,
  patchDepartureMetadata,
  patchDepartureNotes,
  returnDepartureAssetsToStock,
  scanDepartureAssetLoaded,
  scheduleDeparture,
  setDepartureOutgoingStatus,
  startLoadingDeparture,
  undoDepartureAssetLoad,
} from '../controllers/departureController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { DepartureListQuerySchema, validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get(
  '/',
  requirePermission('view_collections'),
  validateQuery(DepartureListQuerySchema),
  getDepartures,
)
router.post('/', requirePermission('create_update_departure'), createDeparture)
router.get('/:departureNumber/history', requirePermission('view_collections'), getDepartureHistory)
router.get('/:departureNumber', requirePermission('view_collections'), getDepartureDetail)
router.patch(
  '/:departureNumber/assets',
  requirePermission('create_update_departure'),
  patchDepartureAssets,
)
router.patch(
  '/:departureNumber/assets/outgoing-status',
  requirePermission('create_update_departure'),
  setDepartureOutgoingStatus,
)
router.post(
  '/:departureNumber/assets/return-to-stock',
  requirePermission('return_to_stock'),
  returnDepartureAssetsToStock,
)
router.patch(
  '/:departureNumber/metadata',
  requirePermission('create_update_departure'),
  patchDepartureMetadata,
)
router.patch(
  '/:departureNumber/departure-date',
  requirePermission('create_update_departure'),
  patchDepartureDate,
)
router.patch(
  '/:departureNumber/notes',
  requirePermission('create_update_departure'),
  patchDepartureNotes,
)
router.post(
  '/:departureNumber/schedule',
  requirePermission('create_update_departure'),
  scheduleDeparture,
)
router.post(
  '/:departureNumber/start-loading',
  requirePermission('create_update_departure'),
  startLoadingDeparture,
)
router.post(
  '/:departureNumber/finish-loading',
  requirePermission('create_update_departure'),
  finishLoadingDeparture,
)
router.post(
  '/:departureNumber/complete',
  requirePermission('create_update_departure'),
  completeDeparture,
)
router.post(
  '/:departureNumber/assets/scan-loaded',
  requirePermission('create_update_departure'),
  scanDepartureAssetLoaded,
)
router.post(
  '/:departureNumber/assets/mark-missing-at-load',
  requirePermission('create_update_departure'),
  markDepartureAssetMissingAtLoad,
)
router.post(
  '/:departureNumber/assets/undo-load',
  requirePermission('create_update_departure'),
  undoDepartureAssetLoad,
)

export default router
