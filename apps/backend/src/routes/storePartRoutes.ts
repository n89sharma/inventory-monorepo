import express from 'express'
import {
  addPurchase,
  addStorePartToAsset,
  getAssetStoreParts,
  getStorePart,
  getStoreParts,
} from '../controllers/storePartController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('view_store'), getStoreParts)
router.get('/asset/:barcode/parts', requirePermission('view_asset'), getAssetStoreParts)
router.post('/asset/:barcode/parts', requirePermission('edit_tech_specs'), addStorePartToAsset)
router.get('/:partNumber', requirePermission('view_store'), getStorePart)
router.post('/', requirePermission('create_update_store'), addPurchase)

export default router
