import express from 'express'
import { getAssetsForInvoice, getInvoices } from '../controllers/invoiceController.js'
import { validateDateRange } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateDateRange, getInvoices)
router.get('/:invoiceNumber', getAssetsForInvoice)

export default router