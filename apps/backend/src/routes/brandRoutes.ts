import express from 'express'
import { createBrand, getBrands, updateBrand } from '../controllers/brandController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getBrands)
router.post('/', requirePermission('update_settings'), createBrand)
router.patch('/:brandId', requirePermission('update_settings'), updateBrand)

export default router
