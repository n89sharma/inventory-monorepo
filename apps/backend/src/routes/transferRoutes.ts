import express from 'express'
import {
  TransferQuerySchema,
  completeTransfer,
  createTransfer,
  deleteTransfer,
  departTransfer,
  getTransferDetail,
  getTransferHistory,
  getTransfers,
  markTransferAssetMissingAtLoad,
  markTransferAssetMissingAtUnload,
  patchTransferAssets,
  patchTransferDate,
  patchTransferMetadata,
  patchTransferNotes,
  returnTransferAssetsToOrigin,
  scanTransferAssetLoaded,
  scanTransferAssetUnloaded,
  scheduleTransfer,
  startLoadingTransfer,
  startUnloadingTransfer,
  undoTransferAssetLoad,
  undoTransferAssetUnload,
} from '../controllers/transferController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get(
  '/',
  requirePermission('view_collections'),
  validateQuery(TransferQuerySchema),
  getTransfers,
)
router.post('/', requirePermission('create_update_transfer'), createTransfer)
router.get('/:transferNumber/history', requirePermission('view_collections'), getTransferHistory)
router.get('/:transferNumber', requirePermission('view_collections'), getTransferDetail)
router.delete('/:transferNumber', requirePermission('delete_collection'), deleteTransfer)
router.patch(
  '/:transferNumber/assets',
  requirePermission('create_update_transfer'),
  patchTransferAssets,
)
router.patch(
  '/:transferNumber/metadata',
  requirePermission('create_update_transfer'),
  patchTransferMetadata,
)
router.patch(
  '/:transferNumber/notes',
  requirePermission('create_update_transfer'),
  patchTransferNotes,
)
router.patch(
  '/:transferNumber/transfer-date',
  requirePermission('create_update_transfer'),
  patchTransferDate,
)
router.post(
  '/:transferNumber/schedule',
  requirePermission('create_update_transfer'),
  scheduleTransfer,
)
router.post(
  '/:transferNumber/start-loading',
  requirePermission('create_update_transfer'),
  startLoadingTransfer,
)
router.post('/:transferNumber/depart', requirePermission('create_update_transfer'), departTransfer)
router.post(
  '/:transferNumber/start-unloading',
  requirePermission('create_update_transfer'),
  startUnloadingTransfer,
)
router.post(
  '/:transferNumber/complete',
  requirePermission('create_update_transfer'),
  completeTransfer,
)
router.post(
  '/:transferNumber/assets/scan-loaded',
  requirePermission('create_update_transfer'),
  scanTransferAssetLoaded,
)
router.post(
  '/:transferNumber/assets/scan-unloaded',
  requirePermission('create_update_transfer'),
  scanTransferAssetUnloaded,
)
router.post(
  '/:transferNumber/assets/mark-missing-at-load',
  requirePermission('create_update_transfer'),
  markTransferAssetMissingAtLoad,
)
router.post(
  '/:transferNumber/assets/mark-missing-at-unload',
  requirePermission('create_update_transfer'),
  markTransferAssetMissingAtUnload,
)
router.post(
  '/:transferNumber/assets/return-to-origin',
  requirePermission('create_update_transfer'),
  returnTransferAssetsToOrigin,
)
router.post(
  '/:transferNumber/assets/undo-load',
  requirePermission('create_update_transfer'),
  undoTransferAssetLoad,
)
router.post(
  '/:transferNumber/assets/undo-unload',
  requirePermission('create_update_transfer'),
  undoTransferAssetUnload,
)

export default router
