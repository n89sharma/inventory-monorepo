import express from 'express'
import {
  AssetQuerySchema,
  LocationsByWarehouseQuerySchema,
  SoldAssetQuerySchema,
  bulkUpdateAssetPricing,
  createAssetComment,
  createAssetHarvestedPart,
  exportAssetReport,
  getAssetAccessories,
  getAssetComments,
  getAssetDetail,
  getAssetErrors,
  getAssetHarvestedParts,
  getAssetHistory,
  getAssetSummaryByBarcode,
  getAssetTransfers,
  getAssets,
  getLocationsByWarehouse,
  getSoldAssets,
  printAssetBarcodes,
  updateAssetErrors,
  updateAssetLocation,
  updateAssetPricing,
  updateAssetSpecs,
} from '../controllers/assetController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('view_asset'), validateQuery(AssetQuerySchema), getAssets)
router.get(
  '/sold',
  requirePermission('view_asset'),
  validateQuery(SoldAssetQuerySchema),
  getSoldAssets,
)
router.post('/export', requirePermission('view_asset'), exportAssetReport)
router.post('/barcodes/print', requirePermission('view_asset'), printAssetBarcodes)
router.get(
  '/locations',
  requirePermission('view_asset'),
  validateQuery(LocationsByWarehouseQuerySchema),
  getLocationsByWarehouse,
)
router.get('/:barcode/history', requirePermission('view_asset'), getAssetHistory)
router.get('/:barcode/summary', requirePermission('view_asset'), getAssetSummaryByBarcode)
router.get('/:barcode', requirePermission('view_asset'), getAssetDetail)
router.get('/:barcode/accessories', requirePermission('view_asset'), getAssetAccessories)
router.get('/:barcode/errors', requirePermission('view_asset'), getAssetErrors)
router.put('/:barcode/errors', requirePermission('update_tech_specs'), updateAssetErrors)
router.put('/:barcode/location', requirePermission('update_location'), updateAssetLocation)
router.put('/bulk/pricing', requirePermission('edit_prices'), bulkUpdateAssetPricing)
router.put('/:barcode/pricing', requirePermission('edit_prices'), updateAssetPricing)
router.put('/:barcode/specs', requirePermission('update_tech_specs'), updateAssetSpecs)
router.get('/:barcode/comments', requirePermission('view_asset'), getAssetComments)
router.post('/:barcode/comments', requirePermission('view_asset'), createAssetComment)
router.get('/:barcode/parts', requirePermission('view_asset'), getAssetHarvestedParts)
router.post('/:barcode/parts', requirePermission('update_tech_specs'), createAssetHarvestedPart)
router.get('/:barcode/transfers', requirePermission('view_asset'), getAssetTransfers)

export default router
