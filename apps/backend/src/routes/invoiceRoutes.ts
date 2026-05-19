import express from 'express'
import { createInvoice, getInvoiceDetail, getInvoiceHistory, getInvoices, patchInvoiceAssets, patchInvoiceMetadata } from '../controllers/invoiceController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateDateRange } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.post('/',                      requirePermission('create_update_invoice'),  createInvoice)
router.get('/',                       requirePermission('view_collections'),       validateDateRange, getInvoices)
router.get('/:invoiceNumber/history', requirePermission('view_collections'),       getInvoiceHistory)
router.patch('/:invoiceNumber/assets',requirePermission('create_update_invoice'),  patchInvoiceAssets)
router.patch('/:invoiceNumber/metadata',requirePermission('create_update_invoice'), patchInvoiceMetadata)
router.get('/:invoiceNumber',         requirePermission('view_collections'),       getInvoiceDetail)

export default router
