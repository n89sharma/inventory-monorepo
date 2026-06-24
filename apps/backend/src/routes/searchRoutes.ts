import express from 'express'
import {
  SearchInStockQuerySchema,
  SearchHeldQuerySchema,
  getAssetsForSearchInStock,
  getAssetsForSearchHeld,
} from '../controllers/assetController.js'
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

router.get(
  '/',
  requirePermission('view_asset'),
  validateQuery(GlobalSearchQuerySchema),
  globalSearch,
)

router.get(
  '/instock',
  requirePermission('view_asset'),
  validateQuery(SearchInStockQuerySchema),
  getAssetsForSearchInStock,
)

router.get(
  '/held',
  requirePermission('view_asset'),
  validateQuery(SearchHeldQuerySchema),
  getAssetsForSearchHeld,
)

router.get(
  '/model-sales',
  requirePermission('view_sale_price'),
  validateQuery(ModelSalesQuerySchema),
  getModelSales,
)

export default router
