import express from 'express'
import { getAssetsBySerialNumber } from '../controllers/assetController.js'
import {
  ProfitabilityReportQuerySchema,
  getHoldsByUserReport,
  getProfitabilityReport,
} from '../controllers/reportController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.post('/serial-number', requirePermission('view_reports'), getAssetsBySerialNumber)

router.get(
  '/profitability',
  requirePermission('view_reports'),
  validateQuery(ProfitabilityReportQuerySchema),
  getProfitabilityReport,
)

router.get('/holds-by-user', requirePermission('view_reports'), getHoldsByUserReport)

export default router
