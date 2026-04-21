import express from 'express'
import { createInvoice, getInvoiceDetail, getInvoiceForUpdate, getInvoices, updateInvoice } from '../controllers/invoiceController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateDateRange } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.post('/', createInvoice)
router.get('/', validateDateRange, getInvoices)
router.get('/:invoiceNumber/edit', getInvoiceForUpdate)
router.put('/:invoiceNumber', updateInvoice)
router.get('/:invoiceNumber', getInvoiceDetail)

export default router