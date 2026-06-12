import express from 'express'
import {
  getModelSales,
  globalSearch,
  GlobalSearchQuerySchema,
  ModelSalesQuerySchema,
} from '../controllers/searchController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('view_asset'), validateQuery(GlobalSearchQuerySchema), globalSearch)

router.get(
  '/model-sales',
  requirePermission('view_sale_price'),
  validateQuery(ModelSalesQuerySchema),
  getModelSales,
)

export default router
