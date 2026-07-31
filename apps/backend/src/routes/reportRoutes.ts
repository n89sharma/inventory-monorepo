import express from 'express'
import { getAssetsBySerialNumber } from '../controllers/assetController.js'
import {
  ModelPriceHistoryQuerySchema,
  ProfitabilityReportQuerySchema,
  getHeldReport,
  getInStockSummaryReport,
  getModelPriceHistory,
  getProfitabilityReport,
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

router.get('/held', requirePermission('view_reports'), getHeldReport)

router.get('/in-stock-summary', requirePermission('view_reports'), getInStockSummaryReport)

router.get(
  '/model-price-history',
  requirePermission('view_sale_price'),
  validateQuery(ModelPriceHistoryQuerySchema),
  getModelPriceHistory,
)

export default router
