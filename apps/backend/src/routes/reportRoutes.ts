import express from 'express'
import { getAssetsBySerialNumber } from '../controllers/assetController.js'
import {
  StockSalesQuerySchema,
  ModelPriceHistoryQuerySchema,
  MonthEndReportQuerySchema,
  ProfitabilityReportQuerySchema,
  createMonthEndReport,
  deleteMonthEndReports,
  getHeldReport,
  getStockSalesReport,
  getModelPriceHistory,
  getMonthEndReport,
  getMonthEndReports,
  getMonthEndSchedule,
  getProfitabilityReport,
  updateMonthEndSchedule,
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

router.get(
  '/stock-sales',
  requirePermission('view_reports'),
  validateQuery(StockSalesQuerySchema),
  getStockSalesReport,
)

router.get('/month-end', requirePermission('view_month_end_report'), getMonthEndReports)

router.post('/month-end', requirePermission('generate_month_end_report'), createMonthEndReport)

router.post(
  '/month-end/bulk-delete',
  requirePermission('delete_month_end_report'),
  deleteMonthEndReports,
)

router.get('/month-end/schedule', requirePermission('view_month_end_report'), getMonthEndSchedule)

router.put('/month-end/schedule', requirePermission('update_settings'), updateMonthEndSchedule)

router.get(
  '/month-end/:id',
  requirePermission('view_month_end_report'),
  validateQuery(MonthEndReportQuerySchema),
  getMonthEndReport,
)

router.get(
  '/model-price-history',
  requirePermission('view_sale_price'),
  validateQuery(ModelPriceHistoryQuerySchema),
  getModelPriceHistory,
)

export default router
