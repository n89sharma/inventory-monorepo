import express from 'express'
import {
  archiveHold,
  createHold,
  getHoldDetail,
  getHoldHistory,
  getHolds,
  HoldQuerySchema,
  patchHoldAssets,
  patchHoldMetadata,
} from '../controllers/holdController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireHoldOwnership } from '../middleware/requireHoldOwnership.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('view_collections'), validateQuery(HoldQuerySchema), getHolds)
router.post('/', requirePermission('create_update_hold'), createHold)
router.get('/:holdNumber/history', requirePermission('view_collections'), getHoldHistory)
router.get('/:holdNumber', requirePermission('view_collections'), getHoldDetail)
router.patch(
  '/:holdNumber/assets',
  requirePermission('create_update_hold'),
  requireHoldOwnership,
  patchHoldAssets,
)
router.patch(
  '/:holdNumber/metadata',
  requirePermission('create_update_hold'),
  requireHoldOwnership,
  patchHoldMetadata,
)
router.patch(
  '/:holdNumber/archive',
  requirePermission('create_update_hold'),
  requireHoldOwnership,
  archiveHold,
)

export default router
