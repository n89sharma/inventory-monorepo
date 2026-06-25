import express from 'express'
import {
  SearchInStockQuerySchema,
  SearchHeldQuerySchema,
  getAssetsForSearchInStock,
  getAssetsForSearchHeld,
} from '../controllers/assetController.js'
import { globalSearch, GlobalSearchQuerySchema } from '../controllers/searchController.js'
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

export default router
