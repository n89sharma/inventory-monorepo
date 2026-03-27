import express from 'express'
import { TransferQuerySchema, getAssetsForTransfer, getTransfers } from '../controllers/transferController.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(TransferQuerySchema), getTransfers)
router.get('/:transferNumber', getAssetsForTransfer)

export default router