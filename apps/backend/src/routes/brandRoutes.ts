import express from 'express'
import { createBrand, getBrands } from '../controllers/brandController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getBrands)
router.post('/', requirePermission('manage_settings'), createBrand)

export default router
