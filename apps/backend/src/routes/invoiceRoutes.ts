import express from 'express'
import { createInvoice, getInvoiceDetail, getInvoices } from '../controllers/invoiceController.js'
import { validateDateRange } from '../middleware/validation.js'

const router = express.Router()

router.post('/', createInvoice)
router.get('/', validateDateRange, getInvoices)
router.get('/:invoiceNumber', getInvoiceDetail)

export default router