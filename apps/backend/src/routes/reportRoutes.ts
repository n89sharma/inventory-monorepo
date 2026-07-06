import express from 'express'
import { getAssetsBySerialNumber } from '../controllers/assetController.js'
import {
  ProfitabilityReportQuerySchema,
  SoldReportQuerySchema,
  getHoldsByUserReport,
  getInStockSummaryReport,
  getProfitabilityReport,
  getSoldReport,
} from '../controllers/reportController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.post('/serial-number', requirePermission('update_settings'), getAssetsBySerialNumber)

router.get(
  '/profitability',
  requirePermission('view_profitability_report'),
  validateQuery(ProfitabilityReportQuerySchema),
  getProfitabilityReport,
)

router.get('/holds-by-user', requirePermission('view_reports'), getHoldsByUserReport)

router.get('/in-stock-summary', requirePermission('view_reports'), getInStockSummaryReport)

router.get(
  '/sold-report',
  requirePermission('view_sale_price'),
  validateQuery(SoldReportQuerySchema),
  getSoldReport,
)

export default router
