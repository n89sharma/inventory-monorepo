import express from 'express'
import { TransferQuerySchema, getTransferDetail, getTransfers } from '../controllers/transferController.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(TransferQuerySchema), getTransfers)
router.get('/:transferNumber', getTransferDetail)

export default router