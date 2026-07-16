import express from 'express'
import { getLocations, printLocationBarcodes } from '../controllers/locationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('update_settings'), getLocations)
router.post('/barcodes/print', requirePermission('update_settings'), printLocationBarcodes)

export default router
