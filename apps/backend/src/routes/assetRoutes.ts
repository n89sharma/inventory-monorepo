import express from 'express'
import {
  AssetQuerySchema,
  getAssetAccessories,
  getAssetComments,
  getAssetDetail,
  getAssetErrors,
  getAssetParts,
  getAssetSummaryByBarcode,
  getAssetTransfers,
  getAssets,
  updateAssetErrors
} from '../controllers/assetController.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(AssetQuerySchema), getAssets)
router.get('/:barcode/summary', getAssetSummaryByBarcode)
router.get('/:barcode', getAssetDetail)
router.get('/:barcode/accessories', getAssetAccessories)
router.get('/:barcode/errors', getAssetErrors)
router.put('/:barcode/errors', updateAssetErrors)
router.get('/:barcode/comments', getAssetComments)
router.get('/:barcode/parts', getAssetParts)
router.get('/:barcode/transfers', getAssetTransfers)

export default router
