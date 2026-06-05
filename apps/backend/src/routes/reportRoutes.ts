import express from 'express'
import { StockReportQuerySchema, getStockReport } from '../controllers/assetController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/stock', requirePermission('view_reports'), validateQuery(StockReportQuerySchema), getStockReport)

export default router
