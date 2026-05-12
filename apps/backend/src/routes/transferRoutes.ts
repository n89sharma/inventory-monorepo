import express from 'express'
import {
  TransferQuerySchema,
  createTransfer,
  getTransferDetail,
  getTransferForUpdate,
  getTransferHistory,
  getTransfers,
  updateTransfer
} from '../controllers/transferController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/',                        requirePermission('view_collections'),         validateQuery(TransferQuerySchema), getTransfers)
router.post('/',                       requirePermission('create_update_transfer'),   createTransfer)
router.get('/:transferNumber/history', requirePermission('view_collections'),         getTransferHistory)
router.get('/:transferNumber/edit',    requirePermission('create_update_transfer'),   getTransferForUpdate)
router.get('/:transferNumber',         requirePermission('view_collections'),         getTransferDetail)
router.put('/:transferNumber',         requirePermission('create_update_transfer'),   updateTransfer)

export default router
