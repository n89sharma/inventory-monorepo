import express from 'express'
import {
  SearchInStockQuerySchema,
  SearchHeldQuerySchema,
  getAssetsForSearchInStock,
  getAssetsForSearchHeld,
  getAssetsBySerialNumber,
} from '../controllers/assetController.js'
import {
  ProfitabilityReportQuerySchema,
  getHoldsBySalespersonReport,
  getProfitabilityReport,
} from '../controllers/reportController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/stock', requirePermission('view_asset'), validateQuery(SearchInStockQuerySchema), getAssetsForSearchInStock)

router.get('/held', requirePermission('view_asset'), validateQuery(SearchHeldQuerySchema), getAssetsForSearchHeld)

router.post('/assets-by-serial-number', requirePermission('view_reports'), getAssetsBySerialNumber)

router.get(
  '/profitability',
  requirePermission('view_reports'),
  validateQuery(ProfitabilityReportQuerySchema),
  getProfitabilityReport,
)

router.get(
  '/holds-by-salesperson',
  requirePermission('view_reports'),
  getHoldsBySalespersonReport,
)

export default router
