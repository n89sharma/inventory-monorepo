import express from 'express'
import {
  getWarehouseTransferCosts,
  updateWarehouseTransferCost,
} from '../controllers/transferController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('view_purchase_price'), getWarehouseTransferCosts)
router.put(
  '/:warehouseId',
  requirePermission('update_settings'),
  requirePermission('view_purchase_price'),
  updateWarehouseTransferCost,
)

export default router
