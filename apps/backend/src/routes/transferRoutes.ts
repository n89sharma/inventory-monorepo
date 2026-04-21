import express from 'express'
import {
  TransferQuerySchema,
  createTransfer,
  getTransferDetail,
  getTransferForUpdate,
  getTransfers,
  updateTransfer
} from '../controllers/transferController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', validateQuery(TransferQuerySchema), getTransfers)
router.post('/', createTransfer)
router.get('/:transferNumber/edit', getTransferForUpdate)
router.get('/:transferNumber', getTransferDetail)
router.put('/:transferNumber', updateTransfer)

export default router
