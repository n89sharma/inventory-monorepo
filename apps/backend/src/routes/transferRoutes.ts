import express from 'express'
import {
  TransferQuerySchema,
  createTransfer,
  dispatchTransfer,
  getTransferDetail,
  getTransferHistory,
  getTransfers,
  patchTransferAssets,
  patchTransferMetadata,
  receiveTransfer,
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
router.post(
  '/:transferNumber/dispatch',
  requirePermission('create_update_transfer'),
  dispatchTransfer,
)
router.post(
  '/:transferNumber/receive',
  requirePermission('create_update_transfer'),
  receiveTransfer,
)

export default router
