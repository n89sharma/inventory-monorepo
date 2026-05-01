import express from 'express'
import {
  AssetQuerySchema,
  BarcodeSuggestionsQuerySchema,
  createAssetComment,
  createPartTransfer,
  getAssetAccessories,
  getAssetComments,
  getAssetDetail,
  getAssetErrors,
  getAssetPartTransfer,
  getAssetSummaryByBarcode,
  getAssetTransfers,
  getAssets,
  getBarcodeSuggestions,
  updateAssetErrors,
  updateAssetPricing,
  updateAssetSpecs
} from '../controllers/assetController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', validateQuery(AssetQuerySchema), getAssets)
router.get('/suggestions', validateQuery(BarcodeSuggestionsQuerySchema), getBarcodeSuggestions)
router.get('/:barcode/summary', getAssetSummaryByBarcode)
router.get('/:barcode', getAssetDetail)
router.get('/:barcode/accessories', getAssetAccessories)
router.get('/:barcode/errors', getAssetErrors)
router.put('/:barcode/errors', updateAssetErrors)
router.put('/:barcode/pricing', updateAssetPricing)
router.put('/:barcode/specs', updateAssetSpecs)
router.get('/:barcode/comments', getAssetComments)
router.post('/:barcode/comments', createAssetComment)
router.get('/:barcode/parts', getAssetPartTransfer)
router.post('/:barcode/parts', createPartTransfer)
router.get('/:barcode/transfers', getAssetTransfers)

export default router
