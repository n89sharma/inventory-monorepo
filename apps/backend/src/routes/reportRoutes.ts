import express from 'express'
import {
  SearchInStockQuerySchema,
  SearchHeldQuerySchema,
  getAssetsForSearchInStock,
  getAssetsForSearchHeld,
} from '../controllers/assetController.js'
import {
  ProfitabilityReportQuerySchema,
  getProfitabilityReport,
} from '../controllers/reportController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/stock', requirePermission('view_asset'), validateQuery(SearchInStockQuerySchema), getAssetsForSearchInStock)

router.get('/held', requirePermission('view_asset'), validateQuery(SearchHeldQuerySchema), getAssetsForSearchHeld)

router.get(
  '/profitability',
  requirePermission('view_reports'),
  validateQuery(ProfitabilityReportQuerySchema),
  getProfitabilityReport,
)

export default router
