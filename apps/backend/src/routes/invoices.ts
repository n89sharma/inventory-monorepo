import express from 'express'
import { getInvoiceDetail, getInvoices } from '../controllers/invoiceController.js'
import { validateDateRange } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateDateRange, getInvoices)
router.get('/:invoiceNumber', getInvoiceDetail)

export default router